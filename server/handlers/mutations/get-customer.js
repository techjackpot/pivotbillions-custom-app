import "isomorphic-fetch";
import { gql } from "apollo-boost";

export function CUSTOMER_GET(customerID) {
  return gql`
    {
      customer(id: "gid://shopify/Customer/${customerID}") {
        id
        email
        displayName
        metafields(namespace: "aqtag", first: 10) {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
      }
    }
  `;
}

export const getCustomer = async (ctx, customerID) => {
  const { client } = ctx;
  const customer = await client
    .query({
      query: CUSTOMER_GET(customerID),
    })
    .then(response => response.data.customer);

  return customer;
};
