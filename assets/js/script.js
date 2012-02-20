/* Author: Robert J. Secord, B.Sc.

*/

(function($, undefined) {

    var initDatagrid;

    // Initialize i18n Support
    /*
    $.i18n.init({
        lng: 'en-US',
        ns: {namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.common'},
        useLocalStorage: false
    }, function() {
        //$('#add').text($.t('ns.common:add'));
        //$('#appname').text($.t('app.name'));
        //$('#apparea').text($.t('app.area'));
        //$('#insert').text($.t('app.insert', {youAre: 'great'}))
        //$('#singular').text($.t('app.child', {count: 1}))
        //$('#plural').text($.t('app.child', {count: 3}))
        //$('#nesting').text($.t('app.district'));
        //$('#male').text($.t('app.friend_context', {context: 'male'}))
        //$('#female').text($.t('app.friend_context', {context: 'female'}))

        //$('.nav').i18n();
        //$('#extendedAttr').i18n();

        initDatagrid();
    });
    */


    // Initialize the Datagrid Control
    initDatagrid = function() {

        // Create DataGrid Column Model
        var columns = ['ID', 'Date', 'Master Admin', 'Admin', 'Moderator', 'Manager', 'Developer', 'Tester', 'End User', 'System'];

        // TEMP: Change column headers
        //for (var i = 0; i < columns.length; i++){columns[i] = 'Col' + (i+1);}

        // DataTypes: number, string, date
        var columnModel = [];
        columnModel.push({
            'label'     : columns[0],
            'dataType'  : 'number',
            'dataField' : null,
            'width'     : (columns[0].length * 10) + 20,
            'hideable'  : true,
            'hidden'    : false,
            'sortable'  : true,
            'sorted'    : false,
            'freezable' : true,
            'frozen'    : false,
            'resizable' : true,
            'movable'   : true
        });
        columnModel.push({
            'label'     : columns[1],
            'dataType'  : 'date',
            'dataField' : null,
            'width'     : 200,
            'hideable'  : true,
            'hidden'    : false,
            'sortable'  : true,
            'sorted'    : 1, // false or 0 = Not sorted, 1 = Ascending, 2 = Descending
            'freezable' : true,
            'frozen'    : false,
            'resizable' : true,
            'movable'   : true
        });
        for (var i = 2; i < columns.length; i++) {
            columnModel.push({
                'label'     : columns[i],
                'dataType'  : 'string',
                'dataField' : null,
                'width'     : (columns[i].length * 10) + 15,
                'hideable'  : true,
                'hidden'    : false,
                'sortable'  : true,
                'sorted'    : false,
                'freezable' : true,
                'frozen'    : false,//(i==3||i==4),
                'resizable' : true,
                'movable'   : true
            });
        }

        // Create DataGrid Data Source
        var s = new Date(1980,0,1).getTime(),
            e = new Date(2010,0,1).getTime(),
            i, j, val, row = {'index': 0, 'cells': []}, dataSource = [];

        for (i = 0; i < 50; i++) {
            row = {'index': i, 'cells': []};
            for (j = 0; j < columnModel.length; j++) {
                if (j == 0) { val = i; }//Math.floor(Math.random()*101); }
                else if (j == 1) { val = new Date(s+Math.random()*(e-s)); }
                else { val = 'Cell ' + (i+1) + '-' + (j+1) + ''; }
                row.cells.push({'data': val, 'edit': ''});
            }
            dataSource.push(row);
        }

        // Create Custom DataGrid Control
        var $datagridEl = $('#datagrid-container');
        $datagridEl.datagrid({
            // Data Source
            dataSource     : dataSource,
            dataSourceType : 'json',

            // Column Model
            columnModel    : columnModel,

            // Sorting
            sortable            : true,
            sortServer          : false,

            // Column Freezing
            freezable           : true,
            freezeScroll        : true,

            // Lazy Loading
            lazyLoad            : {'north': 20, 'south': 20},

            // Last Column Spacer
            spacerCol           : true,
            spacerColWidth      : 50,

            // Last Row Spacer
            spacerRow           : false,
            spacerRowHeight     : 20,

            // Hover Effects on Rows, Columns & Cells
            hover               : {'rows': true, 'cols': false, 'cells': false, 'class': {'prefix': 'hover-'}},

            // Alternate Rows/Columns
            alternate           : {'rows': true, 'cols': true, 'class': {'prefix': 'alt-'}},

            // Header Column Resizing/Moving/Hiding
            columnResize        : true,
            columnMove          : true,
            //columnHideFirst     : false,  // Allow hiding of First Column

            // Header Column Menus
            columnMenus         : true,
            columnMenuHideDelay : 1000,
            columnMenuOffset    : {'x': -2, 'y': -5},

            // CSS Class Name for Themeing
            themeclass          : '',

            // Use Loading Overlay
            useLoadingOverlay   : true,

            // Date Display Format
            dateFormat          : 'fullDate',

            // i18n Support Function
            //i18n                : $.t
        });

        /*$datagridEl
            .bind('datagridScrollTop', function(e, scrollY, offsetY) {
                console.log('external event hook: datagridScrollTop', scrollY, offsetY);
            })
            .bind('datagridScrollLeft', function(e, scrollX, offsetX) {
                console.log('external event hook: datagridScrollLeft', scrollX, offsetX);
            });
        */
    }


    $(document).ready(function() {
        initDatagrid();
    });


})(jQuery);

