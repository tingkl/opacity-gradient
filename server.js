/**
 * Created by dingguoliang01 on 2014/9/11.
 */
var http = require('http');
var fs = require('fs');
var mime = require('mime');
var path = require('path');
var root = path.dirname(module.filename);
var less = require('less');
var querystring = require('querystring');
var url = require('url');
var parser = new (less.Parser)({
    paths: [path.join(__dirname, 'less')], // 指定@import搜索的目录
    filename: path.join(__dirname, 'less/' + 'error.less') // 为了更好地输出错误信息，可以指定一个文件名
});
var connect = require('connect');
var app = connect();
app.use(function (req, res, next) {
    var opt = url.parse(req.url);
    req.pathname = opt.pathname;
    req.query = querystring.parse(opt.query);
    next();
});
app.use(function(req, res, next) {
    if (req.pathname === '/') {
        res.file(path.join(root, 'ps.html'));
    }
    else {
        next();
    }
});
app.use(function (req, res, next) {
    if (req.method === 'POST') {
        var buffers = [];
        var nread = 0;
        req.on('data', function (chunk) {
            buffers.push(chunk);
            nread += chunk.length;
        });
        req.on('end', function () {
            var buffer = null;
            switch (buffers.length) {
                case 0:
                    buffer = new Buffer(0);
                    break;
                case 1:
                    buffer = buffers[0];
                    break;
                default :
                    buffer = new Buffer(nread);
                    for (var i = 0, pos = 0, l = buffers.length; i < l; i++) {
                        var chunk = buffers[i];
                        chunk.copy(buffer, pos);
                        pos += chunk.length;
                    }
                    break;
            }
            //保存POST数据
            req.body = querystring.parse(buffer.toString());
            next();
        });
    }
    else {
        next();
    }
});
app.use(function (req, res, next) {
    if (path.extname(req.pathname) === '.less') {
        var lessPath = path.join(root, req.pathname);
        var cssPath = lessPath.replace('.less', '.css');
        var out_of_date = false;
        if (!fs.existsSync(cssPath)) {
            out_of_date = true;
        } else {
            var a = Date.parse(fs.statSync(lessPath).mtime),
                b = Date.parse(fs.statSync(cssPath).mtime);
            if (a > b) {
                out_of_date = true;
            }
        }
        req.pathname = req.pathname.replace('.less', '.css');
        if (out_of_date) {
            fs.readFile(lessPath, 'utf-8', function (err, lessContent) {
                parser.parse(lessContent, function (err, tree) {
                    if (err) {
                        throw err;
                    } else {
                        fs.writeFile(cssPath, tree.toCSS({ compress: true }), 'utf-8', function (err) {
                            if (err) {
                                throw err;
                            }
                            else {
                                next();
                            }
                        })
                    }
                });
            });
        }
        else {
            next();
        }
    }
    else {
        next();
    }
});
function json(obj) {
    this.writeHead(200, {'Content-Type': 'application/json'});
    this.end(JSON.stringify(obj));
}
function file(path) {
    var me = this;
    this.writeHead(200, {'Content-Type': mime.lookup(path)});
    fs.readFile(path, function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            me.end(data);
        }
    });
}
app.use(function(req, res, next) {
    res.json = json;
    res.file = file;
    next();
});
app.use(function (req, res) {
    if (req.pathname === '/update') {
        var key = req.body.key;
        var func = req.body.func;
        fs.writeFileSync(path.join('lib', key), func);
        res.json({key: key, func: func});
    }
    else if (req.pathname === '/delete') {
        var key = req.body.key;
        fs.unlinkSync(path.join('lib', key));
        res.json({key: key});
    }
    else if (req.pathname === '/map.js') {
        fs.readdir('lib', function (err, files) {
            var map = '{\n';
            files.forEach(function (item, index) {
                var data = fs.readFileSync(path.join(root, 'lib', item)).toString();
                map += '\'' + item + '\':' + data + ',\n';
            });
            map = map.substr(0, map.length - 2) + '\n}';
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(map);
        });
    }
    else {
        res.file(path.join(root, req.pathname));
    }
});
var port = 9001;
http.createServer(app).listen(port, '127.0.0.1');
console.log('Server running at http://127.0.0.1:' + port + '/');