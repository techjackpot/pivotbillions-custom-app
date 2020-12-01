import "isomorphic-fetch";
import { gql } from "apollo-boost";

export function SHOP_GET() {
  return gql`
    {
      shop {
        id
        name
        contactEmail
        privateMetafields(namespace: "aqtag", first: 10) {
          edges {
            node {
              id
              key
              namespace
              value
            }
          }
        }
      }
    }
  `;
}

export const getShop = async (ctx) => {
  const { client } = ctx;
  const shop = await client
    .query({
      query: SHOP_GET(),
    })
    .then(response => response.data.shop);

  return shop;
};
