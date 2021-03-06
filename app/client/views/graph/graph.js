define([
  'extensions/views/view',
  'd3loader!',
  './xaxis',
  './yaxis',
  './yaxisRight',
  './line',
  './stack',
  './hover',
  './tooltip',
  './missing-data'
],
function (View, d3, XAxis, YAxis, YAxisRight, Line, Stack, Hover, Tooltip, MissingData) {

  var Graph = View.extend({

    d3: d3,

    valueAttr: '_count',

    minYDomainExtent: 6,
    numYTicks: 7,
    innerElBorderOffset: 2,

    sharedComponents: {
      xaxis: XAxis,
      yaxis: YAxis,
      yaxisRight: YAxisRight,
      line: Line,
      stack: Stack,
      callout: Tooltip,
      hover: Hover,
      tooltip: Tooltip
    },

    initialize: function (options) {
      View.prototype.initialize.apply(this, arguments);

      var collection = this.collection = options.collection;
      this.listenTo(collection, 'reset add remove sync', function () {
        this.getAxisPeriod();
        this.render();
      });

      this.prepareGraphArea();

      this.scales = {};
      this.margin = {};

      // initialize graph components
      this.componentInstances = [];
      var defaultComponentOptions = this.getDefaultComponentOptions();
      _.each(this.prop('components'), function (definition) {
        var defOptions = _.extend({}, defaultComponentOptions, definition.options);
        this.componentInstances.push(new definition.view(defOptions));
      }, this);

      $(window).on('resize.' + this.cid, _.bind(this.render, this));
    },

    /**
     * Defines default options that get passed to all graph components.
     * This object will be extended with component-specific options.
     * @returns {Object} Default options that get passed to components
     */
    getDefaultComponentOptions: function () {
      return {
        graph: this,
        collection: this.collection,
        model: this.model,
        el: this.figure,
        svg: this.svg,
        wrapper: this.wrapper,
        margin: this.margin,
        scales: this.scales
      };
    },

    showLineLabels: function () {
      return this.model && this.model.get('show-line-labels');
    },

    prepareGraphArea: function () {
      var figure = this.figure = $('<figure/>').addClass('graph');
      if (this.showLineLabels()) {
        figure.addClass('graph-with-labels');
      }
      figure.appendTo(this.$el);

      var graphWrapper = this.graphWrapper = $('<div class="graph-wrapper"></div>');
      graphWrapper.appendTo(figure);

      this.innerEl = $('<div class="inner"></div>');
      this.innerEl.appendTo(graphWrapper);

      var svg = this.svg = this.d3.select(graphWrapper[0]).append('svg');

      // Apply attributes to SVGs so that they're ignored by screenreaders.
      // The WAI-ARIA 1.0 spec says that authors MAY use aria-hidden only
      // if they're hiding content to improve the experience for users
      // of assistive technologies.
      svg.attr('role', 'presentation');
      svg.attr('aria-hidden', 'true');

      this.wrapper = svg.append('g')
        .classed('wrapper', true);
    },

    /**
     * Calculates current factor between size in displayed pixels and logical
     * size.
     */
    scaleFactor: function () {
      return $(this.svg.node()).width() / this.width;
    },

    modelToDate: function (model) {
      var prop = '_start_at';
      var period = this.axisperiod || this.getAxisPeriod();
      if (period === 'hour') {
        prop = '_timestamp';
      } else if (period === 'week' || period === 'quarter') {
        prop = '_end_at';
      }
      return model.get(prop);
    },

    getXPos: function (modelIndex) {
      var model = this.collection.at(modelIndex);
      return model ? this.modelToDate(model) : null;
    },

    getYPos: function (modelIndex, valueAttr) {
      valueAttr = valueAttr || this.valueAttr;
      var model = this.collection.at(modelIndex);
      if (model) {
        return model.get(valueAttr);
      }
      return null;
    },

    getY0Pos: function () {
      return 0;
    },

    calcXScale: function () {
      var start = this.modelToDate(this.collection.first()).toDate(),
          end = this.modelToDate(this.collection.last()).toDate();

      return this.d3.time.scale()
              .domain([start, end])
              .range([0, this.innerWidth]);
    },

    calcYScale: function () {
      var max = this.maxValue();
      var yScale;
      if (this.formatOptions && this.formatOptions.type === 'duration') {
        yScale = d3.time.scale();
        if (max) {
          yScale.domain([0, Math.max(max, this.minYDomainExtent)]);
          var niceScale = d3.time.second;
          if (max > 120000) {
            niceScale = d3.time.min;
          }
          yScale.nice(niceScale);
        }
      } else {
        yScale = this.d3.scale.linear();
        if (max) {
          var tickValues = this.calculateLinearTicks([this.minValue(), Math.max(max, this.minYDomainExtent)], this.numYTicks);
          yScale.domain(tickValues.extent);
          yScale.tickValueList = tickValues.values;
        }
      }
      yScale.rangeRound([this.innerHeight, 0]);
      return yScale;
    },

    maxValue: function () {
      return this.collection.max(this.valueAttr);
    },

    minValue: function () {
      return 0;
    },

    hasData: function () {
      return this.collection.defined(this.valueAttr).length > 0;
    },

    getPeriod: function () {
      return this.collection.getPeriod() || 'week';
    },

    getAxisPeriod: function () {
      var period = (this.model && this.model.get('axis-period')) || this.getPeriod();
      var periods = ['hour', 'day', 'week', 'month', 'quarter'];
      if (this.scales.x) {
        var domain = this.scales.x.domain();
        var start = this.getMoment(domain[0]);
        var end = this.getMoment(domain[1]);
        var index = periods.indexOf(period);
        while (index > 0 && Math.abs(start.diff(end, period)) > 15 && index < periods.length) {
          period = periods[index];
          index++;
        }
      }
      this.axisperiod = period;
      return period;
    },

    /**
     * Returns an object describing evenly spaced, nice tick values given an extent and a minimum tick count.
     * The returned object will include the values, extent and step of the ticks.
     * The extent may be extended to include the next nice tick value.
     *
     * @param extent
     * @param minimumTickCount
     * @return {Object}
     */
    calculateLinearTicks: function (extent, minimumTickCount) {

      if (extent[0] >= extent[1]) {
        throw new Error('Upper bound must be larger than lower.');
      }
      var targetTickCount = (minimumTickCount === 1) ? minimumTickCount : minimumTickCount - 1,
          span = extent[1] - extent[0],
          step = Math.pow(10, Math.floor(Math.log(span / targetTickCount) / Math.LN10)),
          err = targetTickCount / span * step;

      // Filter ticks to get closer to the desired count.
      if (err <= 0.15) {
        step *= 10;
      } else if (err <= 0.35) {
        step *= 5;
      } else if (err <= 0.75) {
        step *= 2;
      }

      // Round start and stop values to step interval.
      var first = Math.floor(extent[0] / step) * step,
          last = Math.ceil(extent[1] / step) * step,
          lastInclusive = last + step / 2;

      return {
        values: _.range(first, lastInclusive, step),
        extent: [first, last],
        step: step
      };
    },

    pxToValue: function (cssVal) {
      if (!_.isString(cssVal)) {
        return null;
      }
      var matches = cssVal.match(/([0-9\.]+)px/);
      return matches ? parseFloat(matches[1]) : null;
    },

    resize: function () {
      var $svg = $(this.svg.node());
      $svg.attr('style', '');
      var width = this.width = $svg.parent().width(),
          height;

      // when both max-width and max-height are defined, scale graph according
      // to this aspect ratio
      var maxWidth = this.pxToValue($svg.css('max-width'));
      var maxHeight = this.pxToValue($svg.css('max-height'));
      var minHeight = this.pxToValue($svg.css('min-height'));

      if (_.isNumber(maxWidth) && _.isNumber(maxHeight)) {
        var aspectRatio = maxWidth / maxHeight;
        height = width / aspectRatio;
        if (_.isNumber(minHeight)) {
          height = Math.max(height, minHeight);
        }
      } else {
        height = $svg.height();
      }
      this.height = height;

      // configure SVG for automatic resize
      this.svg.attr({
        width: '100%',
        height: '100%',
        viewBox: '0 0 ' + width + ' ' + height,
        style: 'max-width:' + width + 'px; max-height:' + height + 'px; display:block;'
      });
      $svg.height(height);

      var innerEl = this.innerEl;
      this.margin.top = innerEl.position().top - this.innerElBorderOffset;
      this.margin.left = innerEl.position().left;

      this.innerWidth = innerEl.outerWidth();
      this.innerHeight = innerEl.outerHeight();

      this.wrapper.attr('transform', 'translate(' + this.margin.left + ', ' +  this.margin.top + ')');
    },

    /**
     * The linelabel figcaption is positioned on top of the graph
     * at small screen sizes using position static.
     */
    lineLabelOnTop: function () {
      return this.$el.find('figcaption').css('position') === 'static';
    },

    /**
     * Hide callout during resize if present. Works around bug in iOS Webkit
     * that incorrectly calculates height of inner element.
     */
    resizeWithCalloutHidden: function () {
      var callout = this.$el.find('.callout');
      var calloutHidden = callout.hasClass('performance-hidden');
      callout.addClass('performance-hidden');

      this.resize();

      if (!calloutHidden) {
        callout.removeClass('performance-hidden');
      }
    },

    /**
     * Applies current configuration, then renders components in defined order
     */
    render: function () {
      if (this.missingData) {
        this.figure.children().show();
        this.missingData.remove();
        delete this.missingData;
      }
      if (this.collection.isEmpty()) {
        this.figure.children().hide();
        var $container = $('<div/>').appendTo(this.figure);
        this.missingData = new MissingData({
          el: $container
        });
        this.missingData.render();
        return;
      }

      View.prototype.render.apply(this, arguments);

      this.resizeWithCalloutHidden();

      this.scales.x = this.calcXScale();
      this.scales.y = this.calcYScale();

      _.each(this.componentInstances, function (component) {
        component.render();
      }, this);
    },

    remove: function () {
      if (this.table) {
        this.table.remove();
      }
      _.invoke(this.componentInstances, 'remove');
      this.componentInstances = [];
      $(window).off('resize.' + this.cid);
      return View.prototype.remove.apply(this, arguments);
    },

    //TODO: these methods should all be some sort of default options
    isOneHundredPercent: function () {
      return false;
    },

    hasTotalLine: function () {
      return false;
    },

    hasTotalLabel: function () {
      return true;
    }

  });

  return Graph;
});
