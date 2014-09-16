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
var parser = new (less.Parser)({
    paths: [path.join(__dirname, 'less')], // 指定@import搜索的目录
    filename: path.join(__dirname, 'less/' + 'error.less') // 为了更好地输出错误信息，可以指定一个文件名
});
function lessFilter(filePath, next) {
    if (path.extname(filePath) === '.less') {
        var cssPath = filePath.replace('.less', '.css');
        var lessPath = filePath;
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
        if (out_of_date) {
            fs.readFile(lessPath, 'utf-8', function (err, lessContent) {
                parser.parse(lessContent, function (err, tree) {
                    if (err) {
                        next(err, filePath);
                    } else {
                        fs.writeFile(cssPath, tree.toCSS({ compress: true }), 'utf-8', function (err) {
                            if (err) {
                                next(err, filePath);
                            }
                            else {
                                next(false, cssPath);
                            }
                        })
                    }
                });
            });
        }
        else {
            next(false, cssPath);
        }
    }
    else {
        next(false, filePath);
    }
}
http.createServer(function (req, res) {
    lessFilter(path.join(root, req.url), function (err, filePath) {
        if (err) {
            throw err;
        }
        else {
            if (filePath === path.join(root, 'update')) {
                var _postData = '';
                //提取POST数据
                req.on('data', function (data) {
                    _postData += data;
                });
                req.on('end', function () {
                    //保存POST数据
                    req.post = querystring.parse(_postData);
                    var key = req.post.key;
                    var func = req.post.func;
                    fs.writeFileSync(path.join('lib', key), func);
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end(JSON.stringify({key: key, func: func}));
                });
            }
            else if (filePath === path.join(root, 'delete')) {
                var _postData = '';
                //提取POST数据
                req.on('data', function (data) {
                    _postData += data;
                });
                req.on('end', function () {
                    //保存POST数据
                    req.post = querystring.parse(_postData);
                    var key = req.post.key;
                    fs.unlinkSync(path.join('lib', key));
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end(JSON.stringify({key: key}));
                });
            }
            else if (filePath === path.join(root, 'map.js')) {
                fs.readdir('lib', function(err, files) {
                    var map = '{\n';
                    files.forEach(function(item, index) {
                        var data = fs.readFileSync(path.join(root, 'lib', item)).toString();
                        map += '\'' + item + '\':' + data + ',\n';
                    });
                    map = map.substr(0, map.length - 2) + '\n}';
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end(map);
                });
            }
            else {
                res.writeHead(200, {'Content-Type': mime.lookup(filePath)});
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        res.end(data);
                    }
                });
            }
        }
    });
}).listen(3000, '127.0.0.1');
console.log('Server running at http://127.0.0.1:3000/');