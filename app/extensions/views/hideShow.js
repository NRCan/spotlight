define([
  'extensions/views/view'
], function (View) {
  return View.extend({
    initialize: function (options) {
      options = options || {};
      this.showLabel = options.showLabel;
      this.hideLabel = options.hideLabel;
      this.$reveal = options.$reveal;
      this.className = options.className || '';
      this.isModule = options.isModule;

      View.prototype.initialize.apply(this, arguments);

      this.render();
    },

    events: {
      'click a': 'showHide'
    },

    render: function () {
      this.$handle = $('<a>', {
        'class': this.className,
        'href': '#',
        'text': this.showLabel
      });
      if (!this.isModule) {
        this.$handle.insertBefore(this.$reveal);
      }
    },

    showHide: function (e) {
      if (this.$reveal.is(':visible')) {
        this.hide();
      } else {
        this.show();
      }
      e.preventDefault();
    },

    show: function () {
      this.$reveal.show();
      this.$handle.text(this.hideLabel);
    },

    hide: function () {
      this.$reveal.hide();
      this.$handle.text(this.showLabel);
    }

  });
});
