<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
    <title>MediaFire</title>
    <link rel="stylesheet" href="resources/css/master-style.css"/>
</head>
<body>

    <div id="loader"></div>

    <?php include 'includes/header.php'; ?>

    <div id="wrapper" class="main-content">
            <div id="empty-folder"></div>
            <div id="scroller-list" class="list-view">
            </div>
        </div>
    </div>

    <?php /*include 'includes/footer.php';*/ ?>

    <script type="text/javascript" src="vendors/zepto.min.js"></script>
    <script type="text/javascript" src="vendors/mediafire.js"></script>
    <script type="text/javascript" src="vendors/scrollbar.js"></script>
    <script type="text/javascript" src="vendors/listview-combined.min.js"></script>
    <script type="text/javascript" src="resources/js/mf-app.js"></script>

</body>
</html>