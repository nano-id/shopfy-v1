export const ORDER_BY_NAME_AND_EMAIL = `#graphql
  query OrderByNameAndEmail($query: String!) {
    orders(first: 1, query: $query) {
      edges {
        node {
          id
          name
          email
          displayFinancialStatus
          displayFulfillmentStatus
          fulfillments(first: 10) {
            id
            status
            trackingInfo {
              company
              number
              url
            }
          }
        }
      }
    }
  }
`;

export const PRODUCTS_SYNC = `#graphql
  query ProductsSync($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          description
          vendor
          productType
          status
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
              }
            }
          }
        }
      }
    }
  }
`;
