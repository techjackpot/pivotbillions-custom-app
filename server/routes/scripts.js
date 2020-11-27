import Router from "koa-router";
import axios from "axios";
import * as handlers from "../handlers/index";

const router = new Router({ prefix: '/scripts' });

router.get('/load-tracking', async (ctx) => {
  ctx.type = 'application/javascript; charset=utf-8';
  ctx.body = `
    ;(function({cid}) {
      if (!cid) return;
      var script = document.createElement('script');
      script.src = '${process.env.HOST}/scripts/tracking-script?cid=' + cid;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    })(__st);
  `;
});

router.get('/tracking-script', async (ctx) => {
  const {cid: customerID} = ctx.query;
  const customerData = await handlers.getCustomer(ctx, customerID);
  const aqtagData = {};
  customerData.metafields.edges.forEach(({node}) => {
    aqtagData[node.key] = node.value;
  });
  console.log('--- loading tracking script', customerID, aqtagData);
  ctx.type = 'application/javascript; charset=utf-8';
  ctx.body = `
    var aqObject = aqObject || {
      _q: [],
      tag: function() { this._q.push(arguments); },
      jsload: function(s, a) {
        this.aqid = a;
        this.fg = (arguments.length > 2)? arguments[2] : "";
        s = "https://" + s + "/" + this.fg + "/" + this.aqid + "?";
        if ((a = document.cookie.match('(^|;) ?aqusr=([^;]*)(;|$)')) && (a = a[2])) s += "1=" + a;
        if ((a = localStorage.getItem("aqusr"))) s += "&12=" + a;
        if ((a = document.createElement("script"))) {
          a.type = "text/javascript";
          a.async = true;
          a.src = s;
          s = document.getElementsByTagName("script")[0];
          s.parentNode.insertBefore(a, s);
        }
      }
    }
    ${aqtagData.domain && aqtagData.code ? `aqObject.jsload("${aqtagData.domain}/asp/aq_mydata.js","${aqtagData.code}");` : ''}
  `;
});

export default router;
