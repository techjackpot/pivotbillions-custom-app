import Router from "koa-router";
import AWS from "aws-sdk";
import {receiveWebhook} from "@shopify/koa-shopify-webhooks";
import axios from "axios";
import AmazonCognitoIdentity from "amazon-cognito-identity-js";
import * as handlers from "../handlers/index";

const router = new Router({ prefix: '/webhooks' });

const {
  SHOPIFY_API_SECRET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_COGNITO_USER_POOL_ID,
  AWS_COGNITO_CLIENT_ID,
  AWS_COGNITO_TEMP_PASSWORD,
  DATA_SERVICE_URL,
} = process.env;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

const webhook = receiveWebhook({secret: SHOPIFY_API_SECRET});

router.post('/customers/create', webhook, async (ctx, next) => {

  const {payload} = ctx.state.webhook;

  const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({region: AWS_REGION});

  const username = payload.email || (payload.first_name + payload.last_name).toLowerCase().replace(/\s/g, '');

  try {

    const userData = await new Promise((resolve, reject) => {
      try {
        const params = {
          UserPoolId: AWS_COGNITO_USER_POOL_ID,
          Username: username,
          MessageAction: 'SUPPRESS',
          TemporaryPassword: AWS_COGNITO_TEMP_PASSWORD,
          UserAttributes: [
            { Name: "given_name", Value: payload.first_name },
            { Name: "family_name", Value: payload.last_name },
            { Name: "name", Value: payload.first_name + ' ' + payload.last_name },
          ],
        };
        if (payload.email) {
          params.UserAttributes.push({ Name: "email", Value: payload.email });
          params.UserAttributes.push({ Name: "email_verified", Value: 'true' });
        }
        if (payload.phone) {
          params.UserAttributes.push({ Name: "phone_number", Value: payload.phone });
        }

        cognitoIdentityServiceProvider.adminCreateUser(params, async function (err, data) {
          console.log(payload);
          if (err) return reject(err);
          console.log(JSON.stringify(data));
          const subValue = data.User.Attributes.find(attr => attr.Name == 'sub').Value;
          console.log(subValue);

          resolve(data);
        });
      } catch(e) {
        reject(e);
      }
    });

    let authData = await new Promise((resolve, reject) => {
      try {
        const params = {
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH', /* required */
          ClientId: AWS_COGNITO_CLIENT_ID, /* required */
          UserPoolId: AWS_COGNITO_USER_POOL_ID, /* required */
          AuthParameters: {
            'USERNAME': username,
            'PASSWORD': AWS_COGNITO_TEMP_PASSWORD,
          }
        };
        cognitoIdentityServiceProvider.adminInitiateAuth(params, function (err, data) {
          if (err) return reject(err);
          console.log('--- authData (challenge)', data);
          resolve(data);
        });
      } catch(e) {
        reject(e);
      }
    });

    if (authData.ChallengeName == 'NEW_PASSWORD_REQUIRED') {
      authData = await new Promise((resolve, reject) => {
        try {
          const params = {
            ChallengeName: authData.ChallengeName, /* required */
            ClientId: AWS_COGNITO_CLIENT_ID, /* required */
            UserPoolId: AWS_COGNITO_USER_POOL_ID, /* required */
            Session: authData.Session,
            ChallengeResponses: {
              'NEW_PASSWORD': AWS_COGNITO_TEMP_PASSWORD,
              'USERNAME': username,
            }
          };
          cognitoIdentityServiceProvider.adminRespondToAuthChallenge(params, function (err, data) {
            if (err) return reject(err);
            console.log('--- authData', data);
            resolve(data);
          });
        } catch(e) {
          reject(e);
        }
      });
    }

    const aqtagData = await new Promise((resolve, reject) => {
      try {
        axios.post(DATA_SERVICE_URL + `/app.php?type=aqtag`, {
          'access_token': authData.AuthenticationResult.AccessToken,
          'refresh_token': authData.AuthenticationResult.RefreshToken,
          'id_token': authData.AuthenticationResult.IdToken,
          'token_type': authData.AuthenticationResult.TokenType,
          'expires_in': authData.AuthenticationResult.ExpiresIn,
        })
        .then(response => {
          console.log(response.config);
          resolve(response.data);
        })
        .catch(err => reject(err));
      } catch(e) {
        reject(e);
      }
    });
    console.log('--aqtagData', aqtagData);


    if (aqtagData.length > 0) {

      const aqtagRow = aqtagData[0];

      const customer = await handlers.updateCustomer(ctx, {
        "id": payload.admin_graphql_api_id,
        "metafields": [
          {
            "namespace": "aqtag",
            "key": "code",
            "value": aqtagRow.aqtag,
            "valueType": "STRING"
          },
          {
            "namespace": "aqtag",
            "key": "domain",
            "value": aqtagRow.domain || aqtagRow.def_aqtag,
            "valueType":"STRING"
          },
          {
            "namespace": "aqtag",
            "key": "gid",
            "value": aqtagRow.aq_gid,
            "valueType":"STRING"
          }
        ]
      });

      console.log('--- customer', customer);

      await ctx.client.resetStore();
    }

  } catch(e) {
    console.log('--- failed', e);
  }


  next();
  // const poolData = {
  //   UserPoolId : AWS_COGNITO_USER_POOL_ID, // Your user pool id here    
  //   ClientId : AWS_COGNITO_CLIENT_ID // Your client id here
  // };
  // const pool_region = AWS_REGION;
  // const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);


  // var attributeList = [];
  // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"name",Value:payload.first_name + ' ' + payload.last_name}));
  // // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"username",Value:(payload.first_name + payload.last_name).toLowerCase().replace(/\s/g, '')}));
  // // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"gender",Value:"male"}));
  // // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"birthdate",Value:"1991-06-21"}));
  // // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"address",Value:"CMB"}));
  // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"email",Value:payload.email}));
  // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"phone_number",Value:payload.phone}));
  // // attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"custom:scope",Value:"admin"}));


  // userPool.signUp(payload.email, AWS_COGNITO_TEMP_PASSWORD, attributeList, null, function(err, result){
  //   if (err) {
  //     console.log(err);
  //     return;
  //   }
  //   let cognitoUser = result.user;
  //   console.log(payload);
  //   console.log(result);
  //   console.log(cognitoUser);
  //   console.log('user name is ' + cognitoUser.getUsername());
  // });

  // console.log('received webhook: ', ctx.state.webhook);
});

export default router;
