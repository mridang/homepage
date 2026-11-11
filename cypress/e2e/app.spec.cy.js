/**
 * @file End-to-end check that the homepage answers with a 200 status.
 */
describe('homepage', () => {
  it('should load the homepage with a 200', () => {
    cy.request('http://localhost:3737/').then((response) =>
      expect(response.status).to.eq(200),
    );
  });
});
