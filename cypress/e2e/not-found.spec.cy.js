describe('404 page', () => {
  it('answers 404 with a page the policy lets render', () => {
    cy.request({
      url: 'http://localhost:3737/nope',
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(404);
      expect(response.headers['content-security-policy']).to.match(
        /style-src 'self' 'sha256-/,
      );
      expect(response.headers['content-security-policy']).to.contain(
        'report-uri /csp/reports',
      );
      expect(response.body).to.contain("We couldn't find that page");
      expect(response.body).not.to.contain(
        'http-equiv="content-security-policy"',
      );
    });
  });

  it('is not blocked by its own policy and links home', () => {
    cy.visit('http://localhost:3737/nope', { failOnStatusCode: false });
    cy.window().then((win) => {
      const violations = [];
      win.document.addEventListener('securitypolicyviolation', (event) =>
        violations.push(event.violatedDirective),
      );
      cy.reload();
      cy.wrap(violations).should('have.length', 0);
    });
    cy.contains('a', 'Back to the home page').should('have.attr', 'href', '/');
  });
});
