var express = require('express');
var router = express.Router();
var getUserData = require('./api').getUserData;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'NBLOGIC' });
});

router.get('/users', (req, res) => {
  res.render('table', { title: 'NBLOGIC'});
});

router.get('/profile', (req, res) => {

  res.render('profile', { title: 'NBLOGIC'});
});

router.post('/', (req, res, next) => {
  var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  console.log(ip);
  next(createError(404));
})

module.exports = router;
