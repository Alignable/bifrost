var proxy = require('redbird')({port: 5050});

proxy.register("http://localhost:5050/vite-page", "http://localhost:5555/vite-page");

proxy.register("http://localhost:5050/", "http://localhost:5557");