/**
 * jQuery Datagrid - Custom Datagrid Control
 *
 * Document     : jquery.datagrid.js
 * Created on   : Jan 13, 2012
 * Author       : Rob Secord
 * Credits      :
 * Version      : 0.1
 * Description  :
 *   -
 * Dependancies :
 *   - jQuery 1.6.4 or later (http://jquery.com)
 *   - jQuery.event.drag 2.0 (http://threedubmedia.com/code/event/drag)
 *   - jQuery.mousewheel 3.0.6 (http://brandonaaron.net/code/mousewheel/docs)
 *   - Date Format 1.2.3 (http://blog.stevenlevithan.com/archives/date-time-format)
 *
 * Todo:
 *   - persistence via cookies
 *   - column hiding/revealing
 *   - server-side sorting
 *   - limit column-freezing to view
 *   - lazy-loading
 *   -
 *   -
 *   - Bugs:
 *       - horizontal scrolling, column reordering and column freezing messes up column menu position
 *       -
*/
/**
 * @internal jQuery Dollar-Safe Mode
 */
(function($, undefined) {

    "strict mode";

    var
        /**
         * @internal Helper functions, see bottom of script
         */
        constrain = null,
        sprintf   = null,
        reorder   = null,
        _t_dev    = null,

        /**
         * i18n Support Function
         *   - should be provided to datagrid constructor within Configuration properties object
         * @access private
         */
        _t = null,

        /**
         * Configuration properties
         * @access private
         */
        defaults = {
            // Data Source
            dataSource          : null,       // Ajax URL or Array of JSON Objects representing Rows matchinh the Column Model
            dataSourceType      : 'json',     // 'ajax' or 'json'

            // Column Model
            columnModel         : null,

            // Sorting
            sortable            : false,
            sortServer          : false,  // Server-side not yet implemented; leave as false to allow client-side

            // Column Freezing
            freezable           : false,
            freezeScroll        : false,  // Should the Scrollbar start after the Freeze Columns?

            // Lazy Loading
            lazyLoadNorth       : false,
            lazyLoadSouth       : false,

            // Last Column Spacer
            spacerCol           : false,
            spacerColWidth      : 50,

            // Last Row Spacer
            spacerRow           : false,
            spacerRowHeight     : 20,

            // Hover Effects on Rows, Columns & Cells
            hover               : {'rows': false, 'cols': false, 'cells': false, 'class': {'prefix': 'hover-'}},

            // Alternate Rows/Columns
            alternate           : {'rows': false, 'cols': false, 'class': {'prefix': 'alt-'}},

            // Header Column Resizing/Moving/Hiding
            columnResize        : false,
            columnMove          : false,
            //columnHideFirst     : false,  // Allow hiding of First Column

            // Header Column Menus
            columnMenus         : false,
            columnMenuHideDelay : 1000,
            columnMenuOffset    : {'x': 0, 'y': 0},

            // CSS Class Name for Themeing
            themeclass          : '',

            // Opacity values for Scrollbar Hover Effects
            scrollbarOpacity    : {'none': 0, 'low': .3, 'high': .6},

            // Use Loading Overlay
            useLoadingOverlay   : false,

            // Date Display Format
            dateFormat          : 'default',     // Format syntax: http://blog.stevenlevithan.com/archives/date-time-format

            // Mousewheel Step-Size
            wheelStep           : 10,

            // Cell Size Limits
            cellSize            : {'min': {'width':50, 'height':10}, 'max': {'width':2000, 'height':100}},

            // i18n Support Function
            i18n                : _t_dev
        };

    /**
     * The Datagrid object.
     *
     * @constructor
     * @class datagrid
     * @access private
     * @param {HtmlElement} element The element to create the control within.
     * @param {Object} options A set of key/value pairs to set as configuration properties.
     * @return undefined
     */
    $.datagrid = function(element, options) {
        this.options = $.extend(true, {}, defaults, options || {});

        // Get container element
        this.$container = $(element);

        // Container needs relative or absolute/fixed positioning
        if (/static/i.test(this.$container.css('position'))) {
            this.$container.css('position', 'relative');
        }

        // Container Data
        this.containerData = {
            'size': {
                'inner': {'width': 0, 'height': 0},
                'outer': {'width': 0, 'height': 0}
            },
            'position': {'top': 0, 'left': 0}
        };

        // Setup internal vars
        // for Data Source
        this.dataSourceUrl = '';
        this.dataSource = this.options.dataSource;
        this.columnModel = this.options.columnModel;

        // for Column Order
        this.columnOrder = [];

        // for Sorting
        this.currentSort = {'column': -1, 'direction': 'ascending', 'field': ''};

        // for Hiding Menus
        this.menuHideTimers = {'root': -1, 'sub': -1};

        // for Scrolling
        this.scrollStep = {'x': 0, 'y': 0, 'x-max': 0, 'y-max': 0};
        this.scrollState = {'x': false, 'y': false, 'x-old': false, 'y-old': false};

        // i18n Support Function
        _t = (typeof this.options.i18n == 'function') ? this.options.i18n : _t_dev;

        // Initializes the Datagrid Control Elements
        this.initialize();
    };

    /**
     * @internal Create shortcuts for internal use
     */
    var $dg = $.datagrid;
    $dg.fn = $dg.prototype = {datagrid: '0.1.0'};
    $dg.fn.extend = $dg.extend = $.extend;

    /**
     * @internal Definition of Datagrid Class
     */
    $dg.fn.extend({

        /**
         * Initialize the Datagrid Control Elements
         *
         * @method initialize
         * @access private
         * @return undefined
         */
        initialize: function() {
            var _self = this;

            // Ensure Valid Column Model
            if (/json/i.test(this.options.dataSourceType) && (!this.columnModel || !this.columnModel.length)) {
                throw new Error(_t('error.invalid-ds-json'));
            }

            // Ensure Valid Data Source
            if (!this.dataSource || !this.dataSource.length) {
                throw new Error(_t('error.invalid-ds'));
            }

            // Store DataSource URL for Ajax Data
            if (/ajax/i.test(this.options.dataSourceType)) {
                this.dataSourceUrl = this.dataSource;
                this.dataSource = null;
            }

            // Add Class to Container
            this.$container.addClass('datagrid-container');
            if (this.options.themeclass.length) {
                this.$container.addClass(this.options.themeclass);
            }

            // Get Size & Position of Container
            this.containerData.size.outer.width = this.$container.outerWidth();
            this.containerData.size.outer.height = this.$container.outerHeight();
            this.containerData.size.inner.width = this.$container.width();
            this.containerData.size.inner.height = this.$container.height();
            this.containerData.position = this.$container.position();

            // Ensure Column Menus are needed
            this.options.columnMenus = (this.options.columnMenus && (this.options.sortable || this.options.freezable));

            // Enable Loading Overlay
            if (this.options.useLoadingOverlay) {
                this.showOverlay(_t('loading.datagrid'));
            }

            // Fetch Data from DataSource (via Ajax or Json), when complete returns here
            this.fetchData({updateColumnModel:true}, function() {
                var i;

                // Store a Copy of the DataSource
                _self.dataSourceCopy = $.merge([], _self.dataSource);

                // Store Column Order
                for (i = 0; i < _self.columnModel.length; i++) {
                    _self.columnOrder.push(i);
                }

                // Sanity check on column model
                for (i = 0; i < _self.columnModel.length; i++) {
                    // Can only freeze columns if there are more than 2 columns
                    _self.columnModel[i].frozen = (_self.options.freezable && _self.columnModel[i].frozen && _self.columnModel.length > 2);

                    // Can't be frozen and hidden; frozen overrules
                    _self.columnModel[i].hidden = (_self.columnModel[i].hidden && !_self.columnModel[i].frozen);

                    // Constrain Column Width
                    _self.columnModel[i].width = constrain(_self.columnModel[i].width, this.options.cellSize.min.width, this.options.cellSize.max.width);

                    // Check for and fix sortable columns, find sort column
                    if (_self.options.sortable && _self.columnModel[i].sortable && _self.currentSort.column == -1) {
                        if (_self.columnModel[i].sorted !== false) {
                            _self.currentSort.column = i;
                            _self.currentSort.direction = _self.columnModel[i].sorted;
                            _self.currentSort.field = _self.columnModel[i].dataField;
                        }
                    } else {
                        _self.columnModel[i].sorted = false;
                    }
                }

                // Sort Data (Client Side)
                if (_self.options.sortable && !_self.options.sortServer && _self.currentSort.column == -1) {
                    _self.sortData();
                }

                // Build Datagrid Control
                _self.prepareDatagrid();
                _self.prepareScrollbars();
                _self.updateDatagrid({'reset':true});
                _self.watchMouseWheel();
                _self.scrollToTop();

                // Build Column Menu
                if (_self.options.columnMenus) {
                    _self.prepareColumnMenu();
                    _self.updateColumnMenuEvents();
                }

                // Hide Loading Overlay
                if (_self.options.useLoadingOverlay) {
                    _self.hideOverlay();
                }
            });
        },

        /**
         * Fetches Data from DataSource (via Ajax or Json)
         *
         * @method fetchData
         * @access private
         * @param Object options An list of options for Fetching Data (only one for now: {updateColumnModel:true|false} )
         * @param Function complete A callback function to execute when the Data Source has been fetched
         * @return undefined
         */
        fetchData: function(options, complete) {
            var _self = this;

            // Ajax Response Data Source
            if (/ajax/i.test(this.dataSourceType)) {

                // Send Ajax Request
                this.jqXhr = $.ajax({
                    'type': 'POST',
                    'url': this.dataSourceUrl,
                    'success': function(data) {
                        data = $.parseJSON(data);

                        // Get Column Model from Response
                        if (options.updateColumnModel) {
                            _self.columnModel = data.columnModel;
                        }

                        // Get Data Source
                        _self.dataSource = data.dataSource;

                        // Get Details about current Result Set
                        _self.resultSetData = data.resultSetData;

                        // Todo: Parse Dates

                        // Call complete function
                        if (typeof complete == 'function') {
                            complete.call(_self);
                        }
                    }
                });
            }

            // Local JSON Data Source
            else {
                // TODO: Build Details about current Result Set Data
                this.resultSetData = {};

                // Call complete function
                if (typeof complete == 'function') {
                    complete.call(this);
                }
            }
        },


        /**
         * Prepares Datagrid Vars and Elements
         *   - Internal Variables for Building Datagrid based on Column Model and Data Source
         *   - Scrolling Container Elements for Datagrid Display
         *
         * @method prepareDatagrid
         * @access private
         * @return undefined
         */
        prepareDatagrid: function() {

            // Check for Required Spacer Column and Update Column Model
            if (this.options.spacerCol) {
                this.columnOrder.push(this.columnOrder.length);
                this.columnModel.push({
                    'label'     : '&nbsp;',
                    'dataType'  : 'spacer',
                    'dataField' : null,
                    'width'     : this.options.spacerColWidth,
                    'hideable'  : false,
                    'hidden'    : false,
                    'sortable'  : false,
                    'freezable' : false,
                    'frozen'    : false
                });
            }

            // Build Header Elements
            this.$headerContainer   = $('<div/>', {'class': 'datagrid-header'}).appendTo(this.$container);
            this.$freezeHeader      = $('<div/>', {'class': 'datagrid-frozen-header'}).appendTo(this.$headerContainer);
            this.$looseHeader       = $('<div/>', {'class': 'datagrid-loose-header'}).appendTo(this.$headerContainer);
            this.$looseHeaderScroll = $('<div/>', {'class': 'datagrid-loose-header-scroll'}).appendTo(this.$looseHeader);   // For Horizontal Scrolling

            // Build Body Elements
            this.$bodyContainer      = $('<div/>', {'class': 'datagrid-body'}).appendTo(this.$container);
            this.$bodyScroll         = $('<div/>', {'class': 'datagrid-body-scroll'}).appendTo(this.$bodyContainer);    // For Vertical Scrolling
            if (this.options.lazyLoadNorth) {
                this.$lazyLoaderNorthRow = $('<div/>', {'class': 'lazy-loader-north'}).appendTo(this.$bodyScroll);
            }
            this.$freezeBody         = $('<div/>', {'class': 'datagrid-frozen-body'}).appendTo(this.$bodyScroll);
            this.$looseBody          = $('<div/>', {'class': 'datagrid-loose-body'}).appendTo(this.$bodyScroll);
            this.$looseBodyScroll    = $('<div/>', {'class': 'datagrid-loose-body-scroll'}).appendTo(this.$looseBody);     // For Horizontal Scrolling
            this.$bodyScroll.append($('<div style="clear:both"></div>'));
            if (this.options.lazyLoadSouth) {
                this.$lazyLoaderSouthRow = $('<div/>', {'class': 'lazy-loader-south'}).appendTo(this.$bodyScroll);
            }
        },


        /**
         *
         *
         * @method updateDatagrid
         * @access private
         * @return undefined
         */
        updateDatagrid: function(options) {
            if (!options) {options = {'reset':true};}
            if (!'reset' in options) {options.reset = true;}

            // Update Metrics of Datagrid
            this.updateDatagridMetrics();

            // Update Events of Datagrid
            options.reset && this.updateDatagridEvents();

            // Update Header Row of Datagrid
            this.updateHeader();

            // Update Body Rows of Datagrid
            this.updateBody();

            // Update size and position of scrollbars
            this.updateScrollbarMetrics(options);

            // Update event handlers for scrollbars
            options.reset && this.updateScrollbarEvents();

            // Update display of scrollbars
            this.updateScrollbarDisplay();

            // Reset Scrolling
            options.reset && this.scrollToStart();
        },


        /**
         *
         *
         * @method updateDatagridMetrics
         * @access private
         * @return undefined
         */
        updateDatagridMetrics: function() {
            var i, $row, $cell;

            this.headerData = {
                'height'     : 0,
                'width'      : {'freezePane': 0, 'loosePane': 0, 'scrollPane': 0},
                'moveBounds' : {'start': 0, 'end': 0},
                'row'        : {'height': 0},
                'cell'       : {'height': 0, 'extraWidth': 0}
            };

            this.bodyData = {
                'start'        : 0,
                'height'       : 0,
                'gridHeight'   : 0,
                'scrollHeight' : 0,
                'width'        : {'freezePane': 0, 'loosePane': 0, 'scrollPane': 0},
                'row'          : {'height': 0},
                'cell'         : {'height': 0, 'extraWidth': 0}
            };

            // Clear Current Header Contents
            this.$freezeHeader.empty();
            this.$looseHeaderScroll.empty();

            // Clear Current Body Contents
            this.$freezeBody.empty();
            this.$looseBodyScroll.empty();

            // Measure Height of Header Rows & Cells
            $row = $('<div/>', {'class': 'datagrid-row', 'css': {'visibility':'hidden'}}).appendTo(this.$headerContainer);
            $cell = $('<div/>', {'class': 'datagrid-cell', 'css': {'float':'none', 'visibility':'hidden'}}).appendTo($row);
            this.headerData.row.height = $row.outerHeight(true);
            this.headerData.cell.height = $cell.outerHeight(true);
            this.headerData.cell.extraWidth = $cell.outerWidth(true) - $cell.width();
            $row.remove();

            // Measure Height of Body Rows & Cells
            $row = $('<div/>', {'class': 'datagrid-row', 'css': {'visibility':'hidden'}}).appendTo(this.$bodyScroll);
            $cell = $('<div/>', {'class': 'datagrid-cell', 'css': {'float':'none', 'visibility':'hidden'}}).appendTo($row);
            this.bodyData.row.height = $row.outerHeight(true);
            this.bodyData.cell.height = $cell.outerHeight(true);
            this.bodyData.cell.extraWidth = $cell.outerWidth(true) - $cell.width();
            $row.remove();

            // Measure height of header & body
            this.headerData.height = Math.max(this.$headerContainer.outerHeight(true), this.headerData.row.height);
            this.bodyData.height = this.containerData.size.inner.height - this.headerData.height;

            // Calculate width of header & body freeze pane
            if (this.options.freezable) {
                for (i = 0; i < this.columnModel.length; i++) {
                    if (this.columnModel[i].frozen) {
                        this.headerData.width.freezePane += (this.columnModel[i].width + this.headerData.cell.extraWidth);
                        this.bodyData.width.freezePane += (this.columnModel[i].width + this.bodyData.cell.extraWidth);
                    }
                }
            }

            // Calculate width of header & body loose pane
            this.headerData.width.loosePane = this.bodyData.width.loosePane = this.containerData.size.inner.width - this.headerData.width.freezePane;

            // Calculate width of header & body scroll pane
            for (i = 0; i < this.columnModel.length; i++) {
                if (!this.columnModel[i].frozen && !this.columnModel[i].hidden) {
                    this.headerData.width.scrollPane += (this.columnModel[i].width + this.headerData.cell.extraWidth);
                    this.bodyData.width.scrollPane += (this.columnModel[i].width + this.bodyData.cell.extraWidth);
                }
                if (/spacer/i.test(this.columnModel[i].dataType)) {
                    this.headerData.moveBounds.end = this.headerData.width.scrollPane - (this.columnModel[i].width + this.headerData.cell.extraWidth);
                }
            }
            if (this.headerData.moveBounds.end == 0) {
                this.headerData.moveBounds.end = this.headerData.width.scrollPane;
            }

            // Measure start of body table
            this.bodyData.start = (this.options.lazyLoadNorth) ? this.$lazyLoaderNorthRow.outerHeight(true) : 0;

            // Height of body scroll pane is measured after body is populated
            this.bodyData.gridHeight = this.bodyData.scrollHeight = 0;
        },

        /**
         *
         *
         * @method updateDatagridEvents
         * @access private
         * @return undefined
         */
        updateDatagridEvents: function() {
            var id, $el, _self = this,

                // Row/Column/Cell Mouse Enter/Leave Event Handler
                cellHover = function(e) {
                    $el = $(e.target);

                    // Mouse Enter Event
                    if (/mouseenter/i.test(e.type)) {
                        // Hover on Rows
                        if (_self.options.hover.rows) {
                            id = $el.parent('.datagrid-row').attr('data-body-rowid');
                            if (!id.length) {return}
                            _self.$bodyContainer.find('[data-body-rowid='+id+']').addClass(_self.options.hover.class.prefix + 'row');
                        }
                        // Hover on Columns
                        if (_self.options.hover.cols) {
                            id = $el.attr('data-body-colid');
                            if (!id.length) {return}
                            _self.$bodyContainer.find('[data-body-colid='+id+']').addClass(_self.options.hover.class.prefix + 'col');
                        }
                        // Hover on Cells
                        if (_self.options.hover.cells) {
                            $el.addClass(_self.options.hover.class.prefix + 'cell');
                        }
                    }

                    // Mouse Leave Event
                    else {
                        // Hover off Rows
                        if (_self.options.hover.rows) {
                            id = $el.parent('.datagrid-row').attr('data-body-rowid');
                            if (!id.length) {return}
                            _self.$bodyContainer.find('[data-body-rowid='+id+']').removeClass(_self.options.hover.class.prefix + 'row');
                        }
                        // Hover off Columns
                        if (_self.options.hover.cols) {
                            id = $el.attr('data-body-colid');
                            if (!id.length) {return}
                            _self.$bodyContainer.find('[data-body-colid='+id+']').removeClass(_self.options.hover.class.prefix + 'col');
                        }
                        // Hover off Cells
                        if (_self.options.hover.cells) {
                            $el.removeClass(_self.options.hover.class.prefix + 'cell');
                        }
                    }
                };

            // Attach events to Body Container
            if (this.options.hover.rows) {
                this.$bodyContainer
                    .delegate('.datagrid-row',  'mouseenter', cellHover)
                    .delegate('.datagrid-row',  'mouseleave', cellHover);
            }
            if (this.options.hover.cols || this.options.hover.cells) {
                this.$bodyContainer
                    .delegate('.datagrid-cell', 'mouseenter', cellHover)
                    .delegate('.datagrid-cell', 'mouseleave', cellHover);
            }
        },

        /**
         *
         *
         * @method updateHeader
         * @access private
         * @return undefined
         */
        updateHeader: function() {
            var i, j, idx, $row;

            // Clear Current Header Contents
            this.$freezeHeader.empty();
            this.$looseHeaderScroll.empty();

            // Update Width of Header Container
            this.$headerContainer.css({'width': this.headerData.width.freezePane + this.headerData.width.loosePane});

            // Populate Frozen Columns
            if (this.options.freezable) {

                // Update width of Freeze Pane
                this.$freezeHeader.css({'width': this.headerData.width.freezePane});

                // Create Freeze Header Row
                $row = $('<div/>')
                    .addClass('datagrid-row freeze')
                    .css({'width': this.headerData.width.freezePane, 'height': this.headerData.cell.height})
                    .appendTo(this.$freezeHeader);

                // Add Frozen Columns to Header Row
                for (i = 0; i < this.columnOrder.length; i++) {
                    // Get Index of Column according to Column Order
                    idx = this.columnOrder[i];

                    // Add Column if it is Frozen
                    if (this.columnModel[idx].frozen) {
                        this.addHeaderCell($row, idx, false);
                    }
                }
            }   // End Frozen Columns


            // Populate Loose Columns

            // Update width of Loose Pane
            this.$looseHeader.css({'width': this.headerData.width.loosePane});
            this.$looseHeaderScroll.css({'width': this.headerData.width.scrollPane});

            // Create Loose Header Row
            $row = $('<div/>')
                .addClass('datagrid-row loose')
                .css({'width': this.headerData.width.scrollPane, 'height': this.headerData.cell.height})
                .appendTo(this.$looseHeaderScroll);

            // Add Loose Columns to Header Row
            for (i = 0; i < this.columnOrder.length; i++) {
                // Get Index of Column according to Column Order
                idx = this.columnOrder[i];

                // Add Column
                if (!this.columnModel[idx].frozen) {
                    // Add Column; last param is a check for spacer column
                    this.addHeaderCell($row, idx, (this.options.spacerCol && i == this.columnOrder.length-1));
                }
            }
        },

        /**
         *
         *
         * @method addHeaderCell
         * @access private
         * @return undefined
         */
        addHeaderCell: function($row, cellIdx, isSpacerCol) {
            var _self = this, $cell;

            // Create Cell Element
            $cell = $('<div/>')
                .addClass('datagrid-cell ' + ($row.hasClass('loose') ? 'loose' : 'freeze'))
                .attr('data-cellindex', cellIdx)
                .css({'width': this.columnModel[cellIdx].width})
                .html('<span class="datagrid-cell-text">' + this.columnModel[cellIdx].label + '</span>')
                .appendTo($row);

            // Check for Spacer Column
            if (isSpacerCol) {
                $cell.css({'cursor':'default'});

                // Spacer Column has no more functionality
                return;
            }

            // Check for Sortable Columns
            if (this.options.sortable && this.columnModel[cellIdx].sortable) {
                this.makeSortable($cell, cellIdx);
            }

            // Check for Resizable Columns
            if (this.options.columnResize && this.columnModel[cellIdx].resizable && !this.columnModel[cellIdx].frozen) {
                this.makeResizable($row, $cell, cellIdx);
            }

            // Check for Movable Columns
            if (this.options.columnMove && this.columnModel[cellIdx].movable && !this.columnModel[cellIdx].frozen) {
                this.makeMovable($row, $cell, cellIdx);
            }

            // Check for Column Menus
            if (this.options.columnMenus && ((this.options.sortable && this.columnModel[cellIdx].sortable) || (this.options.freezable && this.columnModel[cellIdx].freezable))) {
                this.makeColumnMenuArrows($cell, cellIdx);
            }

            // Attach Drag Events to Header Cells
            this.attachDragEvents($row, $cell, cellIdx);
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        makeSortable: function($cell, cellIdx) {
            var $sortArrow;

            // Attach click event to header cell text to enable sorting
            $cell.find('span')
                .addClass('datagrid-sortable')
                .attr('title', _t('column.sort'))
                .bind('click', this._sortColumn(this, $cell));

            // Check if column is sorted
            if (this.currentSort.column == cellIdx) {
                // Add New Sort Arrow
                this.addSortArrow($cell);
            }
        },

        /**
         *
         *
         * @method makeColumnMenuArrows
         * @access private
         * @return undefined
         */
        makeColumnMenuArrows: function($cell, cellIdx) {
            var $colMenuArrow;

            // Add column menu arrow to column header
            $colMenuArrow = $('<div/>')
                .attr({'data-header-colid': 'datagrid-col-' + cellIdx, 'title': _t('column.menu')})
                .addClass('datagrid-menu-arrow')
                .append($('<span/>'))
                .bind('click', this._showColumnMenu(this, $cell))
                .appendTo($cell);

            // Cells require class to identify having a column-menu
            $cell.addClass('menu-arrow');
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        makeResizable: function($row, $cell, cellIdx) {
            var _self = this, $resizeHandle;

            // Add resize handle to column header
            $resizeHandle = $('<div/>')
                .attr('title', _t('column.resize'))
                .addClass('datagrid-resize-handle')
                .appendTo($cell);

            // Cells require class to identify having a resize-handle
            $cell.addClass('resizable');
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        makeMovable: function($row, $cell, cellIdx) {
            var _self = this, $moveHandle;

            // Add move handle to column header
            $moveHandle = $('<div/>')
                .attr('title', _t('column.move'))
                .addClass('datagrid-move-handle')
                .appendTo($cell);

            // Cells require class to identify having a move-handle
            $cell.addClass('movable');
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        attachDragEvents: function($row, $cell, cellIdx) {
            var _self = this;

            $cell
                .click(function() {
                    $(this).toggleClass('drag-initiator');
                })
                .drag('init', function() {
                    if ($(this).is('.drag-initiator')) {
                        return $('.drag-initiator');
                    }
                })
                .drag('start', function(ev, dd) {
                    dd.type = null;
                    if ($(ev.target).hasClass('datagrid-move-handle')) {dd.type = 'move';}
                    if ($(ev.target).hasClass('datagrid-resize-handle')) {dd.type = 'resize';}

                    // Column Resize Event
                    if (/resize/i.test(dd.type)) {
                        // Store widths of elements to be updated
                        dd.colWidth = _self.columnModel[cellIdx].width;
                        dd.cellWidth = $(this).width();
                        dd.rowWidth = $row.width();
                        dd.scrollPaneWidth = _self.headerData.width.scrollPane;
                    }

                    // Column Move Event
                    if (/move/i.test(dd.type)) {
                        // Reset Starrting Column Index
                        dd.oldColumnIdx = null;

                        // Return Move-Marker as Proxy for Drag
                        return $('<div/>')
                            .addClass('datagrid-column-marker')
                            .appendTo(_self.$looseHeaderScroll);
                    }
                })
                .drag('end', function(ev, dd) {
                    // Column Resize Event
                    if (/resize/i.test(dd.type)) {
                        // Update Datagrid from Column Model
                        _self.updateDatagrid({'reset':false});
                    }

                    // Column Move Event
                    if (/move/i.test(dd.type)) {
                        // Reorder Array
                        _self.columnOrder = reorder(_self.columnOrder, dd.oldColumnIdx, dd.newColumnIdx);

                        // Remove Move Marker
                        $(dd.proxy).remove();

                        // Update Datagrid from Column Model
                        _self.updateDatagrid({'reset':false});
                    }
                })
                .drag(function(ev, dd) {
                    var i, j, t, colIdx,
                        cellWidth,
                        frozenCount = 0,
                        advanceFrozenCount = 0,
                        currentLeft = 0,
                        markerOffsetX = 0,
                        offsetX = 0;

                    // Column Resize Event
                    if (/resize/i.test(dd.type)) {
                        // Constrain min cell size
                        if (dd.cellWidth + dd.deltaX < _self.options.cellSize.min.width) {return;}

                        // Constrain min scroll pane size
                        if (dd.scrollPaneWidth + dd.deltaX < _self.headerData.width.loosePane + 10) {return;}

                        // Update width of column in column model
                        _self.columnModel[cellIdx].width = dd.colWidth + dd.deltaX;

                        // Update size of elements
                        _self.$looseHeaderScroll.css({'width': _self.headerData.width.scrollPane + dd.deltaX});
                        $row.css({'width': Math.max(_self.options.cellSize.min.width, dd.rowWidth + dd.deltaX)});
                        $cell.css({'width': Math.max(_self.options.cellSize.min.width, dd.cellWidth + dd.deltaX)});
                    }

                    // Column Move Event
                    if (/move/i.test(dd.type)) {
                        markerOffsetX = Math.round($(dd.proxy).outerWidth(true)/2);
                        offsetX = dd.offsetX;

                        // Correct offset for absolutely positioned elements
                        if (_self.$container.css('position') == 'absolute') {
                            offsetX -= _self.$container.offset().left;
                        }

                        // Correct offset for freeze columns
                        if (_self.options.freezable) {
                            offsetX -= _self.headerData.width.freezePane;
                        }

                        // Correct offset for Scrolling
                        offsetX += _self.horzScrollbarData.scrollLeft;

                        // Constrain Bounds
                        offsetX = constrain(offsetX, _self.headerData.moveBounds.start, _self.headerData.moveBounds.end);

                        // Snap Offset to Cells
                        for (i = 0; i < _self.columnOrder.length; i++) {
                            colIdx = _self.columnOrder[i];
                            if (_self.columnModel[colIdx].frozen) {frozenCount++; continue;}

                            cellWidth = _self.columnModel[colIdx].width + _self.headerData.cell.extraWidth;

                            // Check if Move-Marker is within bounds of cell
                            if (offsetX >= currentLeft && offsetX < currentLeft + cellWidth) {
                                // Get Starting Column Index
                                if (dd.oldColumnIdx == null) {
                                    dd.oldColumnIdx = i;
                                }

                                // On left half of cell
                                if (offsetX < currentLeft + Math.floor(cellWidth / 2)) {
                                    offsetX = currentLeft;

                                    // Moving column backwards
                                    if (i < dd.oldColumnIdx) {
                                        dd.newColumnIdx = i;
                                        while (_self.columnModel[_self.columnOrder[dd.newColumnIdx]].frozen) {dd.newColumnIdx--;}
                                    }

                                    // Moving column forewards
                                    if (i > dd.oldColumnIdx + 1 + frozenCount) {
                                        dd.newColumnIdx = i;
                                        while (_self.columnModel[_self.columnOrder[dd.newColumnIdx]].frozen) {dd.newColumnIdx++;}
                                    }
                                }
                                // On right half of cell
                                else {
                                    offsetX = currentLeft + cellWidth;

                                    // Check number of frozen columns between potential start/end points
                                    advanceFrozenCount = 0;
                                    for (j = i; j < dd.oldColumnIdx; j++) {
                                        if (_self.columnModel[_self.columnOrder[j]].frozen) {
                                            advanceFrozenCount++;
                                        }
                                    }

                                    // Moving column backwards
                                    if (i < dd.oldColumnIdx - 1 - advanceFrozenCount) {
                                        dd.newColumnIdx = i;
                                        while (_self.columnModel[_self.columnOrder[dd.newColumnIdx]].frozen) {dd.newColumnIdx--;}
                                    }

                                    // Moving column forewards
                                    if (i > dd.oldColumnIdx) {
                                        dd.newColumnIdx = i;
                                        while (_self.columnModel[_self.columnOrder[dd.newColumnIdx]].frozen) {dd.newColumnIdx++;}
                                    }
                                }
                                break;
                            }
                            currentLeft += cellWidth;
                        }

                        // Move Marker to Position
                        $(dd.proxy).css({'left': offsetX - markerOffsetX});
                    }
                });
        },


        /**
         *
         *
         * @method updateBody
         * @access private
         * @return undefined
         */
        updateBody: function() {
            var i = 0, j = 0, idx,
                altRowClass = '', altColClass = [],
                cellWidth, cellData, cellClass,
                $looseRow, $freezeRow, $cell;

            // Clear Current Body Contents
            this.$freezeBody.empty();
            this.$looseBodyScroll.empty();

            // Update Width/Height of Body Container
            this.$bodyContainer.css({'width': this.bodyData.width.freezePane + this.bodyData.width.loosePane, 'height': this.bodyData.height});

            // Update width of Freeze Pane
            this.$freezeBody.css({'width': this.bodyData.width.freezePane});

            // Update width of Loose Pane
            this.$looseBody.css({'width': this.bodyData.width.loosePane});
            this.$looseBodyScroll.css({'width': this.bodyData.width.scrollPane});

            // Update width of lazy-loader rows
            if (this.options.lazyLoadNorth) {
                this.$lazyLoaderNorthRow.css({'width': this.bodyData.width.freezePane + this.bodyData.width.loosePane});
            }
            if (this.options.lazyLoadSouth) {
                this.$lazyLoaderSouthRow.css({'width': this.bodyData.width.freezePane + this.bodyData.width.loosePane});
            }

            // Display Contents of Lazy Loaders and Attach Events
            this.updateLazyLoaderContents();
            this.updateLazyLoaderEvents();

            // Determine which columns have alternating column class
            if (this.options.alternate.cols) {
                for (j = 0; j < this.columnOrder.length; j++) {
                    idx = this.columnOrder[j];
                    if (!this.columnModel[idx].frozen) {continue}
                    altColClass[idx] = (((++i)+1) % 2 == 1) ? '' : ' ' + this.options.alternate.class.prefix + 'col';
                }
                for (j = 0; j < this.columnOrder.length; j++) {
                    idx = this.columnOrder[j];
                    if (this.columnModel[idx].frozen) {continue}
                    altColClass[idx] = ((++i+1) % 2 == 1) ? '' : ' ' + this.options.alternate.class.prefix + 'col';
                }
            }

            // Add Rows to both Loose Pane & Freeze Pane
            for (i = 0; i < this.dataSource.length; i++) {
                // Create Loose Row
                $looseRow = $('<div/>')
                    .addClass('datagrid-row loose' + altRowClass)
                    .attr('data-body-rowid', 'datagrid-row-' + i)
                    .css({'width': this.bodyData.width.scrollPane, 'height': this.bodyData.cell.height})
                    .appendTo(this.$looseBodyScroll);

                // Create Freeze Row
                if (this.options.freezable) {
                    $freezeRow = $('<div/>')
                        .addClass('datagrid-row freeze' + altRowClass)
                        .attr('data-body-rowid', 'datagrid-row-' + i)
                        .css({'width': this.bodyData.width.freezePane, 'height': this.bodyData.cell.height})
                        .appendTo(this.$freezeBody);
                }

                // Add Cells to Row according to Column Order
                for (j = 0; j < this.columnOrder.length; j++) {

                    // Get Index of Column according to Column Order
                    idx = this.columnOrder[j];

                    // Check if Last Column is a Spacer Column
                    if (this.options.spacerCol && j == this.columnOrder.length-1) {
                        // Display Spacer Cell
                        cellWidth = this.options.spacerColWidth;
                        cellClass = 'datagrid-cell spacer-cell' + altColClass[idx];
                        cellData = '&nbsp;';
                    } else {
                        // Display Data Cell
                        cellWidth = this.columnModel[idx].width;
                        cellClass = 'datagrid-cell' + altColClass[idx];
                        cellData = this.dataSource[i][idx].data;

                        // Format Cell Data if necessary
                        if (this.columnModel[idx].dataType.toLowerCase() == 'date' && cellData instanceof Date) {
                            cellData = cellData.format(this.options.dateFormat);
                        }
                    }

                    // Create Column Cell
                    $cell = $('<div/>')
                        .addClass(cellClass)
                        .attr('data-body-colid', 'datagrid-col-' + idx)
                        .css({'width': cellWidth})
                        .html(cellData);

                    // Add Column Cell to Row
                    if (this.columnModel[idx].frozen) {
                        $cell.appendTo($freezeRow);
                    } else {
                        $cell.appendTo($looseRow);
                    }
                } // end for(j)

                // Cycle Alternate Rows
                if (this.options.alternate.rows) {
                    altRowClass = (altRowClass.length) ? '' : ' ' + this.options.alternate.class.prefix + 'row';
                }
            } // end for(i)

            // Add Spacer Row to Datagrid
            if (this.options.spacerRow) {

                // Create Loose Row
                $looseRow = $('<div/>')
                    .addClass('datagrid-row loose spacer-row' + altRowClass)
                    .css({'width': this.bodyData.width.scrollPane, 'height': this.options.spacerRowHeight})
                    .appendTo(this.$looseBodyScroll);

                // Create Freeze Row
                if (this.options.freezable) {
                    $freezeRow = $('<div/>')
                        .addClass('datagrid-row freeze spacer-row' + altRowClass)
                        .css({'width': this.bodyData.width.freezePane, 'height': this.options.spacerRowHeight})
                        .appendTo(this.$freezeBody);
                }

                // Add Cells to Row according to Column Order
                for (j = 0; j < this.columnOrder.length; j++) {

                    // Get Index of Column according to Column Order
                    idx = this.columnOrder[j];

                    // Check if Last Column is a Spacer Column
                    if (this.options.spacerCol && j == this.columnOrder.length-1) {
                        cellWidth = this.options.spacerColWidth;
                    } else {
                        cellWidth = this.columnModel[idx].width;
                    }

                    // Create Column Cell
                    $cell = $('<div/>')
                        .addClass('datagrid-cell spacer-cell' + altColClass[idx])
                        .css({'width': cellWidth, 'height': this.options.spacerRowHeight})
                        .html('&nbsp;');

                    // Add Column Cell to Row
                    if (this.columnModel[idx].frozen) {
                        $cell.appendTo($freezeRow);
                    } else {
                        $cell.appendTo($looseRow);
                    }

                } // end for(j)
            } // end if (spacerRow)

            // Measure Height of Scroll Pane
            this.bodyData.gridHeight = this.bodyData.scrollHeight = this.$looseBodyScroll.outerHeight(true);
            if (this.options.lazyLoadNorth) {
                this.bodyData.scrollHeight += this.$lazyLoaderNorthRow.outerHeight(true);
            }
            if (this.options.lazyLoadSouth) {
                this.bodyData.scrollHeight += this.$lazyLoaderSouthRow.outerHeight(true);
            }

            // Update Width/Height of Body Scroll Pane
            this.$bodyScroll.css({'width': this.bodyData.width.freezePane + this.bodyData.width.scrollPane, 'height': this.bodyData.scrollHeight});
        },


        /**
         *
         *
         * @method prepareScrollbars
         * @access private
         * @return undefined
         */
        prepareScrollbars: function() {
            var _self = this,
                scrollbars,
                opacity = this.options.scrollbarOpacity,

                // Function Closure for Hover Effect of Scrollbars
                hoverFunc = function(opacity, els) {
                    return function() {
                        if (!els) {els = [$(this)];}
                        if (!$.isArray(els)) {els = [els];}
                        $.each(els, function(idx, el){
                            el.stop().animate({'opacity': opacity});
                        });
                    };
                };

            // Scrollbar Positioning Data
            this.vertScrollbarData = {'display': 'none', 'top': null, 'width': 0, 'height': 0, 'start': 0, 'stop': 0, 'end': 0, 'padding': 0},
            this.horzScrollbarData = {'display': 'none', 'left': null, 'scrollLeft': 0, 'width': 0, 'height': 0, 'start': 0, 'stop': 0, 'end': 0, 'padding': 0},

            // Create Vertical Scrollbar
            this.$vertScrollbar = $('<div/>')
                .addClass('datagrid-scroll-vert')
                .css({'opacity': opacity.none})
                .hover(hoverFunc(opacity.high), hoverFunc(opacity.low))
                .appendTo(this.$container);

            // Create Horizontal Scrollbar
            this.$horzScrollbar = $('<div/>')
                .addClass('datagrid-scroll-horz')
                .css({'opacity': opacity.none})
                .hover(hoverFunc(opacity.high), hoverFunc(opacity.low))
                .appendTo(this.$container);

            scrollbars = [this.$vertScrollbar, this.$horzScrollbar];
            this.$container.hover(hoverFunc(opacity.low, scrollbars), hoverFunc(opacity.none, scrollbars));
        },

        /**
         *
         *
         * @method updateScrollbarMetrics
         * @access private
         * @return undefined
         */
        updateScrollbarMetrics: function(options) {
            var minSize = 10, reset = (options && options.reset);

            // Check if we need Vertical and/or Horizontal Scrolling
            var hasVertScroll = (this.bodyData.height < this.bodyData.scrollHeight);
            var hasHorzScroll = (this.bodyData.width.loosePane < this.bodyData.width.scrollPane);

            // Determine Thickness of Scrollbars
            this.vertScrollbarData.width = (hasVertScroll) ? this.$vertScrollbar.outerWidth() : 0;
            this.horzScrollbarData.height = (hasHorzScroll) ? this.$horzScrollbar.outerHeight() : 0;

            // Determine Padding of Scrollbars
            this.vertScrollbarData.padding = (hasVertScroll) ? this.$vertScrollbar.cssNumber('right') : 0;
            this.horzScrollbarData.padding = (hasHorzScroll) ? this.$horzScrollbar.cssNumber('bottom') : 0;

            if (hasVertScroll) {
                this.vertScrollbarData.display = 'block';

                // Calculate Starting & Ending Bounds of Vertical Scrollbar
                this.vertScrollbarData.start = this.headerData.height + this.vertScrollbarData.padding;
                this.vertScrollbarData.end = this.headerData.height + this.bodyData.height - this.horzScrollbarData.height - this.vertScrollbarData.padding;

                // Calculate Height of Vertical Scrollbar
                //this.vertScrollbarData.height = Math.floor((this.vertScrollbarData.end - this.vertScrollbarData.start) * (this.bodyData.height / this.bodyData.scrollHeight));
                this.vertScrollbarData.height =((this.vertScrollbarData.end - this.vertScrollbarData.start) * (this.bodyData.height / this.bodyData.scrollHeight)) | 0;
                if (this.vertScrollbarData.height < minSize) {this.vertScrollbarData.height = minSize;}

                // Determine Stop-Position of Scrollbar relative to Height
                this.vertScrollbarData.stop = this.vertScrollbarData.end - this.vertScrollbarData.height;

                // Prevent overlap with Horizontal Scrollbar
                if (hasHorzScroll) {
                    this.vertScrollbarData.stop -= this.horzScrollbarData.padding;
                }

                // Initial Position of Scrollbar
                if (reset) {
                    this.vertScrollbarData.top = this.vertScrollbarData.start;
                }
            }

            if (hasHorzScroll) {
                this.horzScrollbarData.display = 'block';

                // Calculate Starting & Ending Bounds of Horizontal Scrollbar
                this.horzScrollbarData.start = this.horzScrollbarData.padding;
                this.horzScrollbarData.end = this.bodyData.width.freezePane + this.bodyData.width.loosePane - this.vertScrollbarData.width - this.horzScrollbarData.padding;
                if (this.options.freezeScroll) {
                    this.horzScrollbarData.start += this.bodyData.width.freezePane;
                }

                // Calculate Width of Horizontal Scrollbar
                //this.horzScrollbarData.width = Math.floor((this.horzScrollbarData.end - this.horzScrollbarData.start) * (this.bodyData.width.loosePane / this.bodyData.width.scrollPane));
                this.horzScrollbarData.width = ((this.horzScrollbarData.end - this.horzScrollbarData.start) * (this.bodyData.width.loosePane / this.bodyData.width.scrollPane)) | 0;
                if (this.horzScrollbarData.width < minSize) {this.horzScrollbarData.width = minSize;}

                // Determine Stop-Position of Scrollbar relative to Width
                this.horzScrollbarData.stop = this.horzScrollbarData.end - this.horzScrollbarData.width;

                // Prevent overlap with Vertical Scrollbar
                if (hasVertScroll) {
                    this.horzScrollbarData.stop -= this.vertScrollbarData.padding;
                }

                // Initial Position of Scrollbar
                if (reset) {
                    this.horzScrollbarData.left = this.horzScrollbarData.start;
                }
            }
        },

        /**
         *
         *
         * @method updateScrollbarEvents
         * @access private
         * @return undefined
         */
        updateScrollbarEvents: function() {
            var _self = this;

            // Attach Drag Events to Scrollbars
            this.$vertScrollbar
                .drag(function(ev, dd){
                    // Get drag offset of scrollbar
                    var pct, scrollY, offsetY = dd.offsetY;

                    // Adjust offset to container position
                    offsetY -= _self.$container.offset().top;

                    // Constrain offset to bounds
                    offsetY = constrain(offsetY, _self.vertScrollbarData.start, _self.vertScrollbarData.stop);

                    // Scroll
                    _self.scrollTop(offsetY);
                });

            this.$horzScrollbar
                .drag(function(ev, dd){
                    // Get drag offset of scrollbar
                    var pct, scrollX, offsetX = dd.offsetX;

                    // Adjust offset to container position
                    offsetX -= _self.$container.offset().left;

                    // Constrain offset to bounds
                    offsetX = constrain(offsetX, _self.horzScrollbarData.start, _self.horzScrollbarData.stop);

                    // Scroll
                    _self.scrollLeft(offsetX);
                });
        },

        /**
         *
         *
         * @method updateScrollbarDisplay
         * @access private
         * @return undefined
         */
        updateScrollbarDisplay: function() {
            this.$vertScrollbar.css({
                'display' : this.vertScrollbarData.display,
                'top'     : this.vertScrollbarData.top,
                'height'  : this.vertScrollbarData.height
            });
            this.$horzScrollbar.css({
                'display' : this.horzScrollbarData.display,
                'left'    : this.horzScrollbarData.left,
                'width'   : this.horzScrollbarData.width
            });
        },

        /**
         *
         *
         * @method watchMouseWheel
         * @access private
         * @return undefined
         */
        watchMouseWheel: function() {
            var _self = this;

            // Watch for mouse wheel events on container
            this.$container.bind('mousewheel', function(evt, delta) {
                // Calculate distance to move
                var offsetY = _self.vertScrollbarData.top + (-delta * _self.options.wheelStep);
                offsetY = constrain(offsetY, _self.vertScrollbarData.start, _self.vertScrollbarData.stop);

                // Scroll
                _self.scrollTop(offsetY);

                // Allow scrolling of page if reach start/end of datagrid
                return (offsetY == _self.vertScrollbarData.start || offsetY == _self.vertScrollbarData.stop);
            });
        },


        /**
         *
         *
         * @method prepareColumnMenu
         * @access private
         * @return undefined
         */
        prepareColumnMenu: function() {
            // Store position of column menu
            this.columnMenuData = {
                'activeCell': null,
                'position':   {'top': -1000, 'left': -1000},
                'size':       {'width': 0, 'height': 0},
                'caret':      {'position': {'top': 0, 'right': 0}},
                'state':      {
                    'root':   {'open': false, 'hover': false},
                    'sub':    {'open': false, 'hover': false}
                }
            };

            // Create Column Menu Container and Hide it off-screen
            this.$columnMenu = $('<div/>')
                .addClass('datagrid-column-menu')
                .css(this.columnMenuData.position)
                .appendTo(this.$container);

            // Populate Column Menu
            var list = $('<ul/>')
                    .appendTo(this.$columnMenu),

                caret = $('<div/>')
                    .addClass('datagrid-menu-caret')
                    .append($('<span/>'))
                    .appendTo(list);

            // Store original caret position
            this.columnMenuData.caret.position.top = caret.cssNumber('top');
            this.columnMenuData.caret.position.right = caret.cssNumber('right');

            if (this.options.sortable) {
                var sortAsc = $('<a/>')
                    .addClass('datagrid-menu-item')
                    .attr({'href': 'javascript:void(0)', 'title': _t('column.menu.items.sort-asc')})
                    .html('<span class="menu-item-icon"></span><span class="menu-item-display">' + _t('column.menu.items.sort-asc') + '</span>');
                list.append($('<li/>').attr('data-menu-item', 'sort-asc').addClass('sort-asc').append(sortAsc));

                var sortDesc = $('<a/>')
                    .addClass('datagrid-menu-item')
                    .attr({'href': 'javascript:void(0)', 'title': _t('column.menu.items.sort-desc')})
                    .html('<span class="menu-item-icon"></span><span class="menu-item-display">' + _t('column.menu.items.sort-desc') + '</span>');
                list.append($('<li/>').attr('data-menu-item', 'sort-desc').addClass('sort-desc').append(sortDesc));

                var sortClear = $('<a/>')
                    .addClass('datagrid-menu-item')
                    .attr({'href': 'javascript:void(0)', 'title': _t('column.menu.items.sort-clear')})
                    .html('<span class="menu-item-icon"></span><span class="menu-item-display">' + _t('column.menu.items.sort-clear') + '</span>');
                list.append($('<li/>').attr('data-menu-item', 'sort-clear').addClass('sort-clear').append(sortClear));
            }

            // Seperator
            if (this.options.sortable && this.options.freezable) {
                list.append($('<li/>').addClass('menu-seperator').append($('<span/>')));
            }

            if (this.options.freezable) {
                var freezeCol = $('<a/>')
                    .addClass('datagrid-menu-item')
                    .attr({'href': 'javascript:void(0)', 'title': _t('column.menu.items.freeze')})
                    .html('<span class="menu-item-icon"></span><span class="menu-item-display">' + _t('column.menu.items.freeze') + '</span>');
                list.append($('<li/>').attr('data-menu-item', 'freeze').addClass('freeze').append(freezeCol));

                var unfreezeCol = $('<a/>')
                    .addClass('datagrid-menu-item')
                    .attr({'href': 'javascript:void(0)', 'title': _t('column.menu.items.unfreeze')})
                    .html('<span class="menu-item-icon"></span><span class="menu-item-display">' + _t('column.menu.items.unfreeze') + '</span>');
                list.append($('<li/>').attr('data-menu-item', 'unfreeze').addClass('unfreeze').append(unfreezeCol));
            }

            // Store Size of Menu
            this.columnMenuData.size.width = this.$columnMenu.outerWidth(true);
            this.columnMenuData.size.height = this.$columnMenu.outerHeight(true);
        },


        /**
         *
         *
         * @method updateColumnMenuEvents
         * @access private
         * @return undefined
         */
        updateColumnMenuEvents: function() {
            var _self = this;

            // Column Menu Hover Events
            this.$columnMenu.bind('mouseenter mouseleave', function(e) {
                switch (e.type) {
                    case 'mouseenter':
                        // Toggle Hover State
                        _self.columnMenuData.state.root.hover = true;

                        // Clear any Hide Timers on Column Menu
                        if (_self.menuHideTimers.root > -1) {
                            window.clearTimeout(_self.menuHideTimers.root);
                        }
                        break;

                    case 'mouseleave':
                            // Toggle Hover State
                        _self.columnMenuData.state.root.hover = false;

                        // Set Hide Timer on Column Menu
                        _self.menuHideTimers.root = window.setTimeout(function() {
                            _self.hideColumnMenu({'force':false});
                        }, _self.options.columnMenuHideDelay);
                        break;
                }
            });

            // Column Menu Hide Event
            $(document).bind('click', function(e) {
                _self.hideColumnMenu({'force':false});

                // Clear any Hide Timers on Column Menu
                if (_self.menuHideTimers.root > -1) {
                    window.clearTimeout(_self.menuHideTimers.root);
                }
            });

            // Column Menu Item Events
            // Sort Ascending
            this.$columnMenu
                .delegate('[data-menu-item=sort-asc] a', 'click', function(e) {
                    // Sort Rows Ascending
                    _self.sortColumn(_self.columnMenuData.activeCell, 'ascending');

                    // Update Column Menu Items
                    _self.updateColumnMenuItems();
                })
                .delegate('[data-menu-item=sort-desc] a', 'click', function(e) {
                    // Sort Rows Descending
                    _self.sortColumn(_self.columnMenuData.activeCell, 'descending');

                    // Update Column Menu Items
                    _self.updateColumnMenuItems();
                })
                .delegate('[data-menu-item=sort-clear] a', 'click', function(e) {
                    // Clear Sorting
                    _self.clearSort();

                    // Update Column Menu Items
                    _self.updateColumnMenuItems();
                })
                .delegate('[data-menu-item=freeze] a', 'click', function(e) {
                    // Freeze Column
                    _self.freezeColumn();

                    // Hide Column Menu
                    _self.hideColumnMenu({'force':true});
                })
                .delegate('[data-menu-item=unfreeze] a', 'click', function(e) {
                    // Unfreeze Column
                    _self.unfreezeColumn();

                    // Hide Column Menu
                    _self.hideColumnMenu({'force':true});
                });
        },


        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        updateLazyLoaderContents: function() {
            // Create Message for Lazy Loader North
            if (this.options.lazyLoadNorth && !this.$lazyLoaderNorthMessage) {
                this.$lazyLoaderNorthMessage = $('<div/>')
                    .addClass('lazy-loader-north-message')
                    .css({'position':'absolute'})
                    .append($('<span/>', {'class': 'message-title'}).html(_t('lazyloader.north.message.title')))
                    .append($('<span/>', {'class': 'message-body'}).html(_t('lazyloader.north.message.body')))
                    .appendTo(this.$lazyLoaderNorthRow);
            }

            // Create Message for Lazy Loader South
            if (this.options.lazyLoadSouth && !this.$lazyLoaderSouthMessage) {
                this.$lazyLoaderSouthMessage = $('<div/>')
                    .addClass('lazy-loader-south-message')
                    .css({'position':'absolute'})
                    .append($('<span/>', {'class': 'message-title'}).html(_t('lazyloader.south.message.title')))
                    .append($('<span/>', {'class': 'message-body'}).html(_t('lazyloader.south.message.body')))
                    .appendTo(this.$lazyLoaderSouthRow);
            }
        },


        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        updateLazyLoaderEvents: function() {
            var _self = this;

            // Attach Events for Lazy Loader North
            if (this.options.lazyLoadNorth) {
                this.$lazyLoaderNorthMessage.find('.cancel-lazy-loader')
                    .bind('click', function(e) {
                        _self.cancelLazyLoader('north');
                    });
            }

            // Attach Events for Lazy Loader South
            if (this.options.lazyLoadSouth) {
                this.$lazyLoaderSouthMessage.find('.cancel-lazy-loader')
                    .bind('click', function(e) {
                        _self.cancelLazyLoader('south');
                    });
            }
        },



        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        cancelLazyLoader: function(which) {
            // Cancel Loading of Northern Results
            if (/north/i.test(which)) {
                if (!this.options.lazyLoadNorth) {return;}

                // Scroll Datagrid to hide Lazy Loader
                //this.scrollTo(0);
                this.scrollToTop();
            }

            // Cancel Loading of Southern Results
            else {
                if (!this.options.lazyLoadSouth) {return;}

                // Scroll Datagrid to hide Lazy Loader
                //this.scrollTo(this.bodyData.gridHeight - this.bodyData.height);
                this.scrollToBottom();
            }
        },




        /**
         *
         *
         * @method scrollTo
         * @access public
         * @return undefined
         */
        scrollTo: function(offset) {
            this.$bodyContainer.scrollTop(this.bodyData.start + offset);
        },


        /**
         *
         *
         * @method scrollToTop
         * @access public
         * @return undefined
         */
        scrollToTop: function() {
            // Move Body to Top of Datagrid
            this.$bodyContainer.scrollTop(this.bodyData.start);
        },

        /**
         *
         *
         * @method scrollToBottom
         * @access public
         * @return undefined
         */
        scrollToBottom: function() {
            // Move Body to Bottom of Datagrid
            this.$bodyContainer.scrollTop(this.bodyData.start - this.bodyData.height + this.bodyData.gridHeight);
        },

        /**
         *
         *
         * @method scrollToStart
         * @access public
         * @return undefined
         */
        scrollToStart: function() {
            // Move scrolling panes to Left Edge of Datagrid
            this.$looseBodyScroll.css({'left': 0});
            this.$looseHeaderScroll.css({'left': 0});
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        scrollTop: function(offsetY) {
            var pct, scrollY;

            // Determine scrolling position for scrolling pane
            pct = (offsetY - this.vertScrollbarData.start) / (this.vertScrollbarData.stop - this.vertScrollbarData.start);
            scrollY = (this.bodyData.scrollHeight - this.bodyData.height) * pct;

            // Store current position of scrollbar
            this.vertScrollbarData.top = offsetY;

            // Move scrollbar
            this.$vertScrollbar.css({'top': offsetY});

            // Move scrolling pane
            this.$bodyContainer.scrollTop(scrollY);
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        scrollLeft: function(offsetX) {
            var pct, scrollX;

            // Determine scrolling position for scrolling pane
            pct = (offsetX - this.horzScrollbarData.start) / (this.horzScrollbarData.stop - this.horzScrollbarData.start);
            scrollX = (this.bodyData.width.scrollPane - this.bodyData.width.loosePane) * pct;

            // Store current position of scrollbar
            this.horzScrollbarData.left = offsetX;
            this.horzScrollbarData.scrollLeft = scrollX;

            // Move scrollbar
            this.$horzScrollbar.css({'left': offsetX});

            // Move scrolling panes
            this.$looseBodyScroll.css({'left': Math.min(0, 1-scrollX)});     // -1 to hide extra border line on right-side of cells
            this.$looseHeaderScroll.css({'left': Math.min(0, 1-scrollX)});

            // Hide Column Menu if open
            this.hideColumnMenu({'force':false});
        },


        /**
         *
         *
         * @method showColumnMenu
         * @access private
         * @return undefined
         */
        showColumnMenu: function(e, $cell) {
            //e.preventDefault();
            //e.stopPropagation();

            // Hide any Open Column Menus
            this.hideColumnMenu({'force':false});

            // Position Column menu
            var contOffset = this.$container.offset(),
                cellOffset = $cell.position(),
                cellIdx = $cell.attrNumber('data-cellindex'),
                caret = this.$columnMenu.find('.datagrid-menu-caret');

            // Track Active Cell
            this.columnMenuData.activeCell = $cell;

            // Fix Cell offset for absolutely positioned container
            if (this.$container.css('position') == 'absolute') {
                cellOffset = $cell.offset();
            }

            // Position Menu under Header Cell
            this.columnMenuData.position.top = cellOffset.top + $cell.outerHeight() + this.options.columnMenuOffset.y;
            this.columnMenuData.position.left = cellOffset.left + $cell.outerWidth() - this.$columnMenu.outerWidth() + this.options.columnMenuOffset.x;

            // Correct position for absolutely positioned container
            if (this.$container.css('position') == 'absolute') {
                this.columnMenuData.position.top -= contOffset.top;
                this.columnMenuData.position.left -= contOffset.left;
            }

            // Constrain Position within Container
            var leftDiff = Math.min(this.columnMenuData.position.left, 0);
            this.columnMenuData.position.left = Math.max(this.columnMenuData.position.left, 0);
            this.columnMenuData.position.left = Math.min(this.columnMenuData.position.left, this.containerData.size.inner.width - this.columnMenuData.size.width);

            // Mark Cell Arrow as Active
            $cell.find('.datagrid-menu-arrow').addClass('active');

            // Position Caret Arrow
            caret.css({'right': this.columnMenuData.caret.position.right - leftDiff});

            // Update Column Menu Items
            this.updateColumnMenuItems();

            // Move Column Menu into Position and mark as open
            this.$columnMenu
                .addClass('open')
                .css(this.columnMenuData.position);
            this.columnMenuData.state.root.open = true;

            return false;
        },
        /**
         * @internal Function Closure for Open-Column-Menu function
         */
        _showColumnMenu: function(_self, $cell) { return function(e){ return _self.showColumnMenu(e, $cell); }; },

        /**
         *
         *
         * @method updateColumnMenuItems
         * @access private
         * @return undefined
         */
        updateColumnMenuItems: function() {
            var $cell = this.columnMenuData.activeCell, cellIdx = $cell.attrNumber('data-cellindex');

            // Clear Sort State
            this.$columnMenu.find('.menu-checked').removeClass('menu-checked');

            // Hide All Elements
            this.$columnMenu.find('[data-menu-item=sort-asc]').css({'display':'none'});
            this.$columnMenu.find('[data-menu-item=sort-desc]').css({'display':'none'});
            this.$columnMenu.find('[data-menu-item=sort-clear]').css({'display':'none'});
            this.$columnMenu.find('[data-menu-item=freeze]').css({'display':'none'});
            this.$columnMenu.find('[data-menu-item=unfreeze]').css({'display':'none'});
            this.$columnMenu.find('.menu-seperator').css({'display':'none'});

            // Check Sort State
            if (this.options.sortable && this.columnModel[cellIdx].sortable) {
                // Display Sorting Items
                this.$columnMenu.find('[data-menu-item=sort-asc]').css({'display':'block'});
                this.$columnMenu.find('[data-menu-item=sort-desc]').css({'display':'block'});
                this.$columnMenu.find('[data-menu-item=sort-clear]').css({'display':'block'});

                // Apply Checkmark if Sorted
                if (this.currentSort.column == cellIdx) {
                    if (/ascending/i.test(this.currentSort.direction)) {
                        this.$columnMenu.find('[data-menu-item=sort-asc]').addClass('menu-checked');
                    } else {
                        this.$columnMenu.find('[data-menu-item=sort-desc]').addClass('menu-checked');
                    }
                }
            }

            // Check Freeze Column State
            if (this.options.freezable && this.columnModel[cellIdx].freezable) {
                // Display Freeze Items
                if ($cell.hasClass('loose')) {
                    this.$columnMenu.find('[data-menu-item=freeze]').css({'display':'block'});
                } else {
                    this.$columnMenu.find('[data-menu-item=unfreeze]').css({'display':'block'});
                }
            }

            // Display Separator
            if (this.options.sortable && this.columnModel[cellIdx].sortable && this.options.freezable && this.columnModel[cellIdx].freezable) {
                this.$columnMenu.find('.menu-seperator').css({'display':'block'});
            }
        },

        /**
         *
         *
         * @method hideColumnMenu
         * @access private
         * @return undefined
         */
        hideColumnMenu: function(options) {
            if (!this.options.columnMenus || !this.columnMenuData.state.root.open) {return;}

            if (options && !options.force) {
                if (this.columnMenuData.state.root.hover || this.columnMenuData.state.sub.hover) {return;}
            }

            // Clear any Hide Timers on Column Menu
            if (this.menuHideTimers.root > -1) {
                window.clearTimeout(this.menuHideTimers.root);
            }
            if (this.menuHideTimers.sub > -1) {
                window.clearTimeout(this.menuHideTimers.sub);
            }

            // Remove Active State from Cell Arrow
            this.columnMenuData.activeCell.find('.datagrid-menu-arrow').removeClass('active');
            this.columnMenuData.activeCell = null;

            // Move Column Menu Off-Screen
            this.columnMenuData.position.top = -1000;
            this.columnMenuData.position.left = -1000;
            this.$columnMenu.css(this.columnMenuData.position);

            // Mark Column Menu as Closed
            this.$columnMenu.removeClass('open');
            this.columnMenuData.state.root.open = false;
            this.columnMenuData.state.sub.open = false;
        },


        /**
         *
         *
         * @method sortColumn
         * @access private
         * @return undefined
         */
        sortColumn: function($cell, direction) {
            var oldDir = this.currentSort.direction,
                cellIdx = $cell.attrNumber('data-cellindex'),
                newSortCol = (this.currentSort.column != cellIdx);

            // Set Direction
            if (direction && direction.length) {
                this.currentSort.direction = direction;
            } else {
                // Toggle Sort Direction
                if (!newSortCol) {
                    this.currentSort.direction = (oldDir == 'ascending') ? 'descending' : 'ascending';
                }
            }

            // If New Sort Column
            if (newSortCol) {
                // Store New Column Index for Sorting
                this.currentSort.column = cellIdx;

                // Remove Old Sort Arrow
                this.removeSortArrow();

                // Add New Sort Arrow
                this.addSortArrow($cell);
            }

            // Sorting on Same Column
            else {
                // Update Sort Arrow
                this.$headerContainer.find('.datagrid-sort-arrow').removeClass(oldDir).addClass(this.currentSort.direction);
            }

            // Hide Column Menu
            this.hideColumnMenu({'force':false});

            // Sort on Column
            this.sortData();

            // Redisplay Body
            this.updateBody();
        },
        /**
         * @internal Function Closure for Sort-Column function
         */
        _sortColumn: function(_self, $cell) { return function(e){ _self.sortColumn($cell); }; },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        clearSort: function() {
            if (this.currentSort.column == -1) {return;}

            // Clear Sort Data
            this.currentSort = {'column': -1, 'direction': 'ascending', 'field': ''};

            // Remove Sort Arrows
            this.removeSortArrow();

            // Restore original DataSource
            this.dataSource = $.merge([], this.dataSourceCopy);

            // Redisplay Body
            this.updateBody();
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        addSortArrow: function($cell) {
            // Add New Sort Arrow
            $('<div/>')
                .attr('title', _t('sort'))
                .addClass('datagrid-sort-arrow ' + this.currentSort.direction)
                .bind('click', this._sortColumn(this, $cell))
                .appendTo($cell);
        },

        /**
         *
         *
         * @method
         * @access private
         * @return undefined
         */
        removeSortArrow: function() {
            // Remove Old Sort Arrow
            this.$headerContainer.find('.datagrid-sort-arrow').remove();
        },

        /**
         *
         *
         * @method sortData
         * @access private
         * @return undefined
         */
        sortData: function() {
            if (!this.options.sortable || this.options.sortServer) {return;}

            // Sort Data Source Client-Side
            this.dataSource.sort(this._sortCompare(this));
        },

        /**
         *
         *
         * @method sortCompare
         * @access private
         * @return undefined
         */
        sortCompare: function(valA, valB) {
            var r = 0,
                dir = this.currentSort.direction.toLowerCase(),
                a = valA[this.currentSort.column].data,
                b = valB[this.currentSort.column].data;

            // Check Data Type for Sort
            switch (this.columnModel[this.currentSort.column].dataType.toLowerCase()) {
                case 'number':
                    if (typeof a == 'string') a = parseFloat(a.replace(/[$,]/g, ''));
                    if (typeof b == 'string') b = parseFloat(b.replace(/[$,]/g, ''));
                    r = (dir == 'ascending') ? a - b : b - a;
                    break;

                case 'string':
                    a = a.toUpperCase();
                    b = b.toUpperCase();
                    r = (dir == 'ascending') ? ((a < b) ? -1 : 1) : ((a > b) ? -1 : 1);
                    break;

                case 'date':
                    a = (a instanceof Date) ? a.getTime() : 0; // Convert to Integer for Sorting
                    b = (b instanceof Date) ? b.getTime() : 0; // Convert to Integer for Sorting
                    r = (dir == 'ascending') ? a - b : b - a;
                    break;
            }
            return r;
        },
        /**
         * @internal Function Closure for Sort-Comparison function to maintain "this" keyword
         */
        _sortCompare: function(_self) { return function(a,b){ return _self.sortCompare(a,b); }; },


        /**
         *
         *
         * @method freezeColumn
         * @access private
         * @return undefined
         */
        freezeColumn: function() {
            var cellIdx = this.columnMenuData.activeCell.attrNumber('data-cellindex');

            // Mark Column as Frozen
            this.columnModel[cellIdx].frozen = true;

            // Update Datagrid
            this.updateDatagrid({'reset':true});
        },

        /**
         *
         *
         * @method unfreezeColumn
         * @access private
         * @return undefined
         */
        unfreezeColumn: function() {
            var cellIdx = this.columnMenuData.activeCell.attrNumber('data-cellindex');

            // Mark Column as Frozen
            this.columnModel[cellIdx].frozen = false;

            // Update Datagrid
            this.updateDatagrid({'reset':true});
        },


        /**
         * Displays an Overlay with a Message Block on top of the Datagrid Control
         *
         * @method showOverlay
         * @access private
         * @param String loadingText The text to display with the Loading Icon
         * @param String loadingTitle The text to display in the Message Block Title (optional)
         * @return undefined
         */
        showOverlay: function(loadingText, loadingTitle) {
            // Create Overlay Elements
            if (!this.$overlay || !this.$overlay.length) {
                // BG Overlay
                this.$overlay = $('<div/>')
                    .addClass('datagrid-overlay')
                    .css({'position':'absolute', 'display':'none'})
                    .appendTo($('body'));

                // Overlay Loading Message Block
                this.$overlayMessage = $('<div/>')
                    .addClass('datagrid-overlay-message')
                    .css({'position':'absolute', 'display':'none'})
                    .append($('<span/>', {'class': 'message-title'}))
                    .append($('<span/>', {'class': 'message-body'}))
                    .appendTo($('body'));

                // Store Overlay Opacity
                this.overlayOpacity = parseFloat(this.$overlay.css('opacity'));

                // Resize New Elements
                this.resizeOverlay();
            }

            // Add Loading Title/Message
            if (!loadingTitle || !loadingTitle.length) {
                loadingTitle = _t('loading.title');
            }
            this.$overlayMessage.find('.message-title').empty().html(loadingTitle);
            this.$overlayMessage.find('.message-body').empty().html(loadingText);

            // Display the Overlay
            var _self = this;
            this.$overlay
                .css({'display':'block', 'opacity':0})
                .animate({'opacity':this.overlayOpacity}, 300, function(){
                    // Display the Message Block
                    _self.$overlayMessage
                        .css({'display':'block', opacity:0})
                        .animate({'opacity':1}, 300);
                });
        },

        /**
         * Hides the Overlay and Message Block from the Datagrid Control
         *
         * @method hideOverlay
         * @access private
         * @return undefined
         */
        hideOverlay: function() {
            // Hide the Message Block
            var _self = this;
            this.$overlayMessage
                .animate({'opacity':0}, 300, function(){
                    _self.$overlayMessage.css({'display':'none'});
                    // Hide the Overlay
                    _self.$overlay
                        .animate({'opacity':0}, 300, function(){
                            _self.$overlay.css({'display':'none'});
                        });
                });
        },

        /**
         * Resizes and Repositions the Overlay and Message Block to match the Datagrid Container
         *
         * @method resizeOverlay
         * @access private
         * @return undefined
         */
        resizeOverlay: function(loadingText, loadingTitle) {
            // Vars for Calculating Size/Position of Overlay and Message Block
            var bw = 0,                                   bh = 0,
                cl = this.containerData.position.left,    ct = this.containerData.position.top,
                cw = this.containerData.size.outer.width, ch = this.containerData.size.outer.height,
                mw = this.$overlayMessage.width(),        mh = this.$overlayMessage.height();

            // Account for Borders unless were in IE Quirks Mode
            if (!$.browser.msie || !/BackCompat/i.test(document.compatMode)) {
                bw = this.$overlay.cssNumber('border-left-width') + this.$overlay.cssNumber('border-right-width');
                bh = this.$overlay.cssNumber('border-top-width') + this.$overlay.cssNumber('border-bottom-width');
            }

            // Resize & Reposition Overlay
            this.$overlay.css($.extend({}, {'width': cw - bw, 'height': ch - bh}, this.containerData.position));

            // Reposition Message Block
            this.$overlayMessage.css({
                'top': ct + Math.round(ch / 2) - Math.round(mh / 2),
                'left': cl + Math.round(cw / 2) - Math.round(mw / 2)
            });
        }

    });


    /**
     * @internal Declaration of DataGrid Class and Helper Functions
     */
    $.extend($.fn, {
        /**
         * Creates a Datagrid on all matched elements.
         *
         * @method datagrid
         * @access public
         * @param {Object|String} options A set of key/value pairs to set as configuration properties or a method name to call on a formerly created instance.
         * @return jQuery
         */
        datagrid: function( options ) {
            if (typeof options == 'string') {
                var instance = $(this).data('datagrid'), args = Array.prototype.slice.call(arguments, 1);
                return instance[options].apply(instance, args);
            } else {
                return this.each(function() {
                    var instance = $(this).data('datagrid');
                    if (instance) {
                        if (options) {
                            $.extend(instance.options, options);
                        }
                        instance.reload();
                    } else {
                        $(this).data('datagrid', new $dg(this, options));
                    }
                });
            }
        },


        /**
         * Helper Function - Returns the numerical value of an Html Element Attribute
         *
         * @method attrNumber
         * @access public
         * @param string attr An Html Element Attribute to grab the numerical value of
         * @return mixed Returns the numerical value or FALSE
         */
        attrNumber: function(attr) {
            var v = parseInt(this.attr(attr), 10);
            if (isNaN(v)) {return 0;}
            return v;
        },


        /**
         * Helper Function - Returns the numerical value of a CSS key
         *
         * @method cssNumber
         * @access public
         * @param string key A CSS key to grab the numerical value of
         * @return mixed Returns the numerical value or FALSE
         */
        cssNumber: function(key) {
            var v = parseInt(this.css(key), 10);
            if (isNaN(v)) {return 0;}
            return v;
        }
    });


    /**
     * Helper Function - for formatting strings
     *
     * @method sprintf
     * @access public
     * @param string s A string with formatting sequences
     * @param mixed arguments a list of arguments used for parameter insertion
     * @return string
     */
    sprintf = function(s) {
        var i, bits = s.split('%'), out = bits[0], re = /^([ds])(.*)$/;
        for (i = 1; i < bits.length; i++) {
            p = re.exec(bits[i]);
            if (!p || arguments[i]==null) {continue;}
            if (p[1] == 'd') {
                out += parseInt(arguments[i], 10);
            } else if (p[1] == 's') {
                out += arguments[i];
            }
            out += p[2];
        }
        return out;
    };



    /**
     * Helper Function - Reorders an array
     *
     * @method reorder
     * @access public
     * @return ...
     */
    reorder = function(sourceArray, moveIndex, toIndex) {
        if( moveIndex == toIndex ) return sourceArray;
        var t, i, dir = (moveIndex < toIndex) ? 1 : -1;
        for (i = moveIndex; (dir == 1 && i < toIndex) || (dir != 1 && i > toIndex); i+=dir) {
            t = sourceArray[i];
            sourceArray[i] = sourceArray[i+dir];
            sourceArray[i+dir] = t;
        }
        return sourceArray;
    };


    /**
     * Helper Function - Constrains a number within a specified range
     *
     * @method constrain
     * @access public
     * @param Number val the value to be constrained
     * @param Number low the lower bounds of the constraint
     * @param Number high the upper bounds of the constraint
     * @return Number the constrained value
     */
    constrain = function(val, low, high) {
        return Math.min(high, Math.max(val, low));
    };


    /**
     * Helper Function - for providing simple translation mapping when i18n support is missing
     *
     * @method _t_dev
     * @access private
     * @param string t A translation key to fetch a translation mapped message for
     * @return string
     */
    _t_dev = function(t) {
        var
            // Translation Helpers
            // Error Types
            e = {
                'type': {
                    'dev'  : 'jQuery.datagrid Developer Error',
                    'user' : 'jQuery.datagrid User Error'
                }
            },

            // Translation Mappings
            map = {
                'error.invalid-ds-json' : e.type.dev + ': initialize() -> Invalid Column Model supplied for Datagrid with Data Source Type = JSON.',
                'error.invalid-ds'      : e.type.dev + ': initialize() -> Invalid Data Source supplied for Datagrid.',

                'loading.title'    : 'Please wait,',
                'loading.datagrid' : 'Loading Datagrid...',

                'column.sort'   : 'Sort',
                'column.resize' : 'Resize',
                'column.move'   : 'Reorder',
                'column.menu'   : 'More',

                'column.menu.items.sort-asc'   : 'Sort Ascending',
                'column.menu.items.sort-desc'  : 'Sort Descending',
                'column.menu.items.sort-clear' : 'Clear Sort',
                'column.menu.items.freeze'     : 'Freeze Column',
                'column.menu.items.unfreeze'   : 'Unfreeze Column',

                'lazyloader.north.message.title' : 'Loading more results..',
                'lazyloader.north.message.body'  : '<a href="javascript:void(0)" class="cancel-lazy-loader" rel="north">cancel</a>',
                'lazyloader.south.message.title' : 'Loading more results..',
                'lazyloader.south.message.body'  : '<a href="javascript:void(0)" class="cancel-lazy-loader" rel="south">cancel</a>',

                'lazyloader.north.message.none.title'  : 'No more results.',
                'lazyloader.north.message.none.body'   : '<a href="javascript:void(0)" class="refresh-lazy-loader" rel="north">refresh</a>',
                'lazyloader.south.message.none.title'  : 'No more results.',
                'lazyloader.south.message.none.body'   : '<a href="javascript:void(0)" class="refresh-lazy-loader" rel="south">refresh</a>'
            };

        return (t in map) ? map[t] : t;
    };


})(jQuery);

