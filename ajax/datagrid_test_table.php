<?
    require_once('datagrid_test_table_data.php');

    // Name of Tasting Table
    $datagridTestTable = 'DataGridTest';

    // Get Query Request Vars
    $request = array();
    $request['rows'] = 50;
    $request['rowStart'] = 0;
    $request['sortColumn'] = '';
    $request['sortDirection'] = 1;
    $request['columnModel'] = false;

    // Number of Rows for Response
    if (isset($_REQUEST['r'])) {
        $request['rows'] = intval($_REQUEST['r']);
    }

    // Index of Row to Start at for Response
    if (isset($_REQUEST['rs'])) {
        $request['rowStart'] = trim($_REQUEST['rs']);
    }

    // Column to Sort on For Response
    if (isset($_REQUEST['sc'])) {
        $request['sortColumn'] = trim($_REQUEST['sc']);
    }

    // Direction of Sort for Response
    if (isset($_REQUEST['sd'])) {
        $request['sortDirection'] = intval($_REQUEST['sd']);
    }

    // Include Column Model in Response?
    if (isset($_REQUEST['cm']) && $_REQUEST['cm'] == 1) {
        $request['columnModel'] = true;
    }

    // Build Response Data
    $responseData = array();

    // Connect to DB
    connectDB();

    // Ensure Test Table Exists
    if (!checkTestTableExists($datagridTestTable)) {
        createTestTable($datagridTestTable);
    }

    // Result Set Info
    $resultSetInfo = array('start'=>($request['rowStart'] == 0), 'end'=>false);

    // Get Result Set from DB based on Request Vars
    $query = array();
    $query[] = 'SELECT * FROM ' . $datagridTestTable;

    // Sort Order
    if (strlen($request['sortColumn']) > 0) {
        $query[] = 'ORDER BY ' . $request['sortColumn'] . (($request['sortDirection'] == 1) ? ' ASC' : ' DESC');
    }

    // Limit Result Set
    $query[] = 'LIMIT ' . $request['rowStart'] . ', ' . $request['rows'] + 1;

    // Execute Query
    $result = mysql_query(implode(' ', $query));

    // Massage Results into Proper Format
    $resultSet = array();
    if ($result !== false) {
        $rowIndex = 0;
        while ($row = mysql_fetch_assoc($result)) {
            $cells = array();
            foreach ($row as $cellData) {
                $cells[] = array('data'=>$cellData, 'edit'=>'');
            }

            // Append Row Data to Result Set
            $resultSet[] = array('index'=>$rowIndex++, 'cells'=>$cells);
        }

        // Make sure we don't have an extra row; we use that to determine if we're at end of record set
        if (count($resultSet) > $request['rows']) {
            array_pop($resultSet);
        } else {
            $resultSetInfo['end'] = true;
        }
    }

    // Add Result Set to Response Data
    $responseData['resultSet'] = $resultSet;

    // Add Result Set Info to Response Data
    $responseData['resultSetInfo'] = $resultSetInfo;

    // Add Column Model to Response Data
    if ($request['columnModel']) {
        $responseData['columnModel'] = getColumnModel();
    }

    // Disconnect from DB
    disconnectDB();


    // Output Response Data in JSON format
    echo json_encode($responseData);
?>