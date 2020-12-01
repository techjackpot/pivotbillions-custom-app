import "isomorphic-fetch";
import { gql } from "apollo-boost";

export function METAFIELDS_UPDATE() {
  return gql`
    mutation ($input: PrivateMetafieldInput!) {
      privateMetafieldUpsert(input: $input) {
        privateMetafield {
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
}

export const updateMetafield = async (ctx, variables) => {
  const { client } = ctx;
  const metafield = await client
    .mutate({
      mutation: METAFIELDS_UPDATE(),
      variables: {
        "input": variables,
      },
    })
    .then(response => response.data.privateMetafieldUpsert.privateMetafield);

  return metafield;
};
