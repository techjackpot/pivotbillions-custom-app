import AWS from "aws-sdk";
import axios from "axios";
import AmazonCognitoIdentity from "amazon-cognito-identity-js";
import * as handlers from "./";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_COGNITO_USER_POOL_ID,
  AWS_COGNITO_CLIENT_ID,
  AWS_COGNITO_TEMP_PASSWORD,
  DATA_SERVICE_URL,
  HOST,
} = process.env;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

export const registerShop = (ctx, {shop, accessToken}) => {

  return new Promise(async (resolve, reject) => {

    const shopData = await handlers.getShop(ctx);

    const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({region: AWS_REGION});

    const username = shopData.name;

    try {

      const userData = await new Promise((resolve, reject) => {
        try {
          const params = {
            UserPoolId: AWS_COGNITO_USER_POOL_ID,
            Username: username,
            MessageAction: 'SUPPRESS',
            TemporaryPassword: AWS_COGNITO_TEMP_PASSWORD,
            UserAttributes: [
            ],
          };
          if (shopData.contactEmail) {
            params.UserAttributes.push({ Name: "email", Value: shopData.contactEmail });
            params.UserAttributes.push({ Name: "email_verified", Value: 'true' });
          }

          cognitoIdentityServiceProvider.adminCreateUser(params, async function (err, data) {
            console.log(shopData);
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

        const metafields = [];

        metafields.push( await handlers.updateMetafield(ctx, {
          "namespace": "aqtag",
          "key": "code",
          "valueInput": {
            "value": aqtagRow.aqtag,
            "valueType": "STRING",
          },
        }) );
        metafields.push( await handlers.updateMetafield(ctx, {
          "namespace": "aqtag",
          "key": "domain",
          "valueInput": {
            "value": aqtagRow.domain || aqtagRow.def_aqtag,
            "valueType": "STRING",
          },
        }) );
        metafields.push( await handlers.updateMetafield(ctx, {
          "namespace": "aqtag",
          "key": "gid",
          "valueInput": {
            "value": aqtagRow.aq_gid,
            "valueType": "STRING",
          },
        }) );

        console.log('--- metafields', metafields);

        const scriptTag = await handlers.createScriptTag(ctx, {
          src: `${HOST}/scripts/load-tracking`
        });
        console.log('--- scriptTag', scriptTag);

        await ctx.client.resetStore();

      }

      resolve();

    } catch(e) {
      console.log('--- failed', e);
      reject(e);
    }

  });

};
