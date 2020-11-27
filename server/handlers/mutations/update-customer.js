import "isomorphic-fetch";
import { gql } from "apollo-boost";

export function CUSTOMER_UPDATE() {
  return gql`
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
}

export const updateCustomer = async (ctx, variables) => {
  const { client } = ctx;
  const customer = await client
    .mutate({
      mutation: CUSTOMER_UPDATE(),
      variables: {
        "input": variables,
      },
    })
    .then(response => response.data.customerUpdate.customer);

  return customer;
};
