navigator.camera = {
    getPicture: function(success, failure, options) {
        success("chrome-logo.png");
    }
}

Camera = {
    DestinationType: {
        DATA_URL: null
    }
}