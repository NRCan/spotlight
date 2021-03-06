define([
  'page_config'
],
function (PageConfig) {
  describe('PageConfig', function () {

    var req;
    beforeEach(function () {
      var get = jasmine.createSpy();
      get.plan = function (prop) {
        return {
          assetPath: '/path/to/assets/',
          govukHost: 'www.gov.uk',
          bigScreenBaseURL: 'https://www.performance.service.gov.uk'
        }[prop];
      };
      var headers = jasmine.createSpy();
      headers.plan = function(prop) {
        return {
          'Request-Id': 'a-uuid',
          'GOVUK-Request-Id': '1231234123'
        }[prop];
      };
      req = {
        app: {
          get: get
        },
        get: headers,
        protocol: 'http',
        originalUrl: '/performance/foo'
      };
    });

    describe('getGovUkUrl', function () {
      it('returns the equivalent page location on GOV.UK', function () {
        expect(PageConfig.getGovUkUrl(req)).toEqual('https://www.gov.uk/performance/foo');
      });
    });

    describe('commonConfig', function () {
      it('contains assetPath property', function () {
        var commonConfig = PageConfig.commonConfig(req);
        expect(commonConfig.assetPath).toEqual('/path/to/assets/');
      });
      it('contains bigScreenBaseURL property', function () {
        var commonConfig = PageConfig.commonConfig(req);
        expect(commonConfig.bigScreenBaseURL).toEqual('https://www.performance.service.gov.uk');
      });
      it('contains assetPath property', function () {
        var commonConfig = PageConfig.commonConfig(req);
        expect(commonConfig.url).toEqual('/performance/foo');
      });
      it('contains requestId property', function() {
        var commonConfig = PageConfig.commonConfig(req);
        expect(commonConfig.requestId).toEqual('a-uuid');
      });
    });
  });
});
