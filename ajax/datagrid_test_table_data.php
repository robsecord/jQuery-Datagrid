<?

// Column Field Names/Labels
$columnLabels = array(
    'RowID'       => 'ID',
    'Date'        => 'Date',
    'MasterAdmin' => 'Master Admin',
    'Admin'       => 'Admin',
    'Moderator'   => 'Moderator',
    'Manager'     => 'Manager',
    'Developer'   => 'Developer',
    'Tester'      => 'Tester',
    'EndUser'     => 'End User',
    'System'      => 'System'
);


// Connect to DB
function connectDB() {
    $dbConn = mysql_connect('mysql412.ixwebhosting.com', 'sumitsa_secord1', 'W3d94e49g345');
    if (!$dbConn) { die('Could not connect: ' . mysql_error()); }
    mysql_select_db('sumitsa_robsecord_lab', $dbConn);
}

// Disconnect DB
function disconnectDB() {
    mysql_close($dbConn);
}

// Check if Test Table Exists
function checkTestTableExists($tableName = 'UnnamedTable') {
    $result = @mysql_query('SELECT * FROM ' . $tableName . ' LIMIT 0, 10');
    return ($result !== false);
}


// Create Test Table
function createTestTable($tableName = 'UnnamedTable') {
    // Create Test Table Fields
    $fields = array();
    foreach ($columnLabels as $fieldName => $columnLabel) {
        switch($fieldName) {
            case 'RowID':
                $fields[] = sprintf('%s INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY', $fieldName);
                break;
            case 'Date':
                $fields[] = sprintf('%s VARCHAR(32)', $fieldName);
                break;
            default:
                $fields[] = sprintf('%s VARCHAR(255)', $fieldName);
                break;
        }
    }

    // Execute Query
    $query = 'CREATE TABLE IF NOT EXISTS ' . $tableName . ' (' . implode(',', $fields) . ') TYPE = InnoDB COMMENT = \'Datagrid Test Table\';';
    $result = mysql_query($query);
    if (!$result) { die('Failed to create test table: ' . mysql_error()); }

    // Create Test Table Rows
    $rows = array();
    for ($i = 0; $i < 1000; $i++) {
        $cells = array();
        foreach ($columnLabels as $fieldName => $columnLabel) {
            switch($fieldName) {
                case 'RowID':
                    $cells[] = $i;
                    break;
                case 'Date':
                    $cells[] = '"'.mt_rand(1990,2020).'/'.mt_rand(1,12).'/'.mt_rand(1,31).'"';
                    break;
                default:
                    $cells[] = sprintf('"Cell %d-%d"', $i+1, $j+1);
                    break;
            }
        }
        $rows[] = '('.implode(',', $cells).')';
    }

    // Execute Query
    $query = 'INSERT INTO ' . $tableName . ' (' . implode(',', array_keys($columnLabels)) . ') VALUES ' . implode(',', $rows);
    $result = mysql_query($query);
    if (!$result) { die('Failed to insert rows into test table: ' . mysql_error()); }
}



// Create DataGrid Column Model
function getColumnModel() {
    $columnModel = array();

    foreach ($columnLabels as $fieldName => $columnLabel) {
        switch($fieldName) {
            case 'RowID':
                $columnModel[] = array(
                    'label'     => $columnLabel,
                    'dataType'  => 'number',
                    'dataField' => $fieldName,
                    'width'     => 50,
                    'hideable'  => true,
                    'hidden'    => false,
                    'sortable'  => true,
                    'sorted'    => false,
                    'freezable' => true,
                    'frozen'    => false,
                    'resizable' => true,
                    'movable'   => true
                );
                break;
            case 'Date':
                $columnModel[] = array(
                    'label'     => $columnLabel,
                    'dataType'  => 'date',
                    'dataField' => $fieldName,
                    'width'     => 200,
                    'hideable'  => true,
                    'hidden'    => false,
                    'sortable'  => true,
                    'sorted'    => false,
                    'freezable' => true,
                    'frozen'    => false,
                    'resizable' => true,
                    'movable'   => true
                );
                break;
            default:
                $columnModel[] = array(
                    'label'     => $columnLabel,
                    'dataType'  => 'string',
                    'dataField' => $fieldName,
                    'width'     => (strlen($columnLabel) * 10) + 20,
                    'hideable'  => true,
                    'hidden'    => false,
                    'sortable'  => true,
                    'sorted'    => false,
                    'freezable' => true,
                    'frozen'    => false,
                    'resizable' => true,
                    'movable'   => true
                );
                break;
        }
    }
    return $columnModel;
}
?>