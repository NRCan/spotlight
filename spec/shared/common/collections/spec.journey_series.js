define([
  'common/collections/journey_series'
], function (JourneySeriesCollection) {
  describe('JourneySeriesCollection', function () {
    var TestCollection;
    beforeEach(function () {
      TestCollection = JourneySeriesCollection.extend({
        axes: {
          y: [
            {
              groupId: 'example:downloadFormPage',
              label: 'A'
            },
            {
              groupId: 'example:submitApplicationPage',
              label: 'B'
            },
            {
              groupId: 'example:end',
              label: 'C'
            }
          ]
        }
      });

      this.addMatchers({
        toHaveStartAndEndDatesMatching: function (startDate, endDate) {
          return this.actual.start_at.format('YYYY-MM-DDTHH:mm:ss') === startDate &&
            this.actual.end_at.format('YYYY-MM-DDTHH:mm:ss') === endDate;
        }
      });
    });

    describe('initialize', function () {
      it('allows setting axes from the constructor', function () {
        var collection = new JourneySeriesCollection([], {
          axes: {
            y: [
              { groupId: 'example:downloadFormPage', label: 'A' }
            ]
          }
        });

        expect(collection.axes).toEqual({
          y: [
            { groupId: 'example:downloadFormPage', label: 'A' }
          ]
        });
      });
    });

    describe('parse', function () {
      it('should not change order if they follow the specified sort order', function () {
        var models = [
          {stepAttr: 'example:downloadFormPage', uniqueEvents: 54321},
          {stepAttr: 'example:submitApplicationPage', uniqueEvents: 4321},
          {stepAttr: 'example:end', uniqueEvents: 321}
        ];
        var collection = new TestCollection({ data: models }, {parse: true});

        expect(collection.at(0).get('step')).toEqual('example:downloadFormPage');
        expect(collection.at(1).get('step')).toEqual('example:submitApplicationPage');
        expect(collection.at(2).get('step')).toEqual('example:end');
      });

      it('should reorder according to a provided sort order', function () {
        var models = [
          {stepAttr: 'example:submitApplicationPage', uniqueEvents: 4321},
          {stepAttr: 'example:downloadFormPage', uniqueEvents: 54321},
          {stepAttr: 'example:end', uniqueEvents: 321}
        ];
        var collection = new TestCollection({ data: models }, {parse: true});

        expect(collection.at(0).get('step')).toEqual('example:downloadFormPage');
        expect(collection.at(1).get('step')).toEqual('example:submitApplicationPage');
        expect(collection.at(2).get('step')).toEqual('example:end');
      });

      it('should not include unrecognised keys', function () {
        var models = [
          {stepAttr: 'afly_1', uniqueEvents: 4321},
          {stepAttr: 'example:downloadFormPage', uniqueEvents: 54321},
          {stepAttr: 'example:submitApplicationPage', uniqueEvents: 321},
          {stepAttr: 'example:end', uniqueEvents: 3211}
        ];
        var collection = new TestCollection({ data: models }, {parse: true});

        expect(collection.length).toEqual(3);
        expect(collection.at(0).get('step')).toEqual('example:downloadFormPage');
        expect(collection.at(1).get('step')).toEqual('example:submitApplicationPage');
        expect(collection.at(2).get('step')).toEqual('example:end');
      });

      it('assigns step from a configurable property', function () {
        var models = [
          {customStep: 'example:downloadFormPage', uniqueEvents: 50000},
          {customStep: 'example:submitApplicationPage', uniqueEvents: 25000},
          {customStep: 'example:end', uniqueEvents: 10000}
        ];

        var collection = new TestCollection(null, { matchingAttribute: 'customStep' });
        collection.reset(collection.parse({ data: models }));

        expect(collection.at(0).get('step')).toEqual('example:downloadFormPage');
        expect(collection.at(0).get('uniqueEvents')).toEqual(50000);
      });

      it('defaults to eventCategory when no step is configured', function () {
        var models = [
          {eventCategory: 'example:downloadFormPage', uniqueEvents: 50000},
          {eventCategory: 'example:submitApplicationPage', uniqueEvents: 25000},
          {eventCategory: 'example:end', uniqueEvents: 10000}
        ];

        var collection = new TestCollection(null);
        collection.reset({ data: models }, { parse: true });

        expect(collection.at(0).get('step')).toEqual('example:downloadFormPage');
        expect(collection.at(0).get('uniqueEvents')).toEqual(50000);
      });

      it('should fill in missing data points with 0', function () {
        var models = [
          {eventCategory: 'example:downloadFormPage', uniqueEvents: 50000},
          {eventCategory: 'example:submitApplicationPage', uniqueEvents: 25000},
          {eventCategory: 'example:end'}
        ];
        var collection = new TestCollection();
        var output = collection.parse({ data: models });

        expect(output[0].uniqueEvents).toEqual(50000);
        expect(output[1].uniqueEvents).toEqual(25000);
        expect(output[2].uniqueEvents).toEqual(0);
      });

      it('should fill in missing data points with 0 when custom valueAttr is specified', function () {
        var models = [
          {eventCategory: 'example:downloadFormPage', value: 50000},
          {eventCategory: 'example:submitApplicationPage', value: 25000},
          {eventCategory: 'example:end'}
        ];
        var collection = new TestCollection([], { valueAttr: 'value' });
        var output = collection.parse({ data: models });

        expect(output[0].value).toEqual(50000);
        expect(output[1].value).toEqual(25000);
        expect(output[2].value).toEqual(0);
      });

      it('should not fill in missing data points with 0 if all are missing', function () {
        var models = [
          {eventCategory: 'example:downloadFormPage'},
          {eventCategory: 'example:submitApplicationPage'},
          {eventCategory: 'example:end'}
        ];
        var collection = new TestCollection();
        var output = collection.parse({ data: models });

        expect(output[0].uniqueEvents).toBeNull();
        expect(output[1].uniqueEvents).toBeNull();
        expect(output[2].uniqueEvents).toBeNull();
      });

      it('adds a groupId prefixed value to each model', function () {
        var models = [
          {eventCategory: 'example:downloadFormPage', uniqueEvents: 50000},
          {eventCategory: 'example:submitApplicationPage', uniqueEvents: 25000},
          {eventCategory: 'example:end', uniqueEvents: 10000}
        ];

        var collection = new TestCollection(null);
        collection.reset({ data: models }, { parse: true });

        expect(collection.at(0).get('example:downloadFormPage:uniqueEvents')).toEqual(50000);
        expect(collection.at(1).get('example:submitApplicationPage:uniqueEvents')).toEqual(25000);
        expect(collection.at(2).get('example:end:uniqueEvents')).toEqual(10000);
      });

    });
  });
});
