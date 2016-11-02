var APP;
$(function () {
  APP = new Vue({
    el: 'body',
    data: {
      repos: []
    },
    methods: {
      submit () {
        APP.repos = []
      }
    }
  })


  init()
})

function init() {
  $.post('http://192.168.26.128:2000/api/latest', {}, function(data) {
    data.items.forEach(function(item) {
      item.fresh = freshData(item.pushed_at)
    })
    APP.repos = data.items
  })
}


// 获取更新频率
function freshData(time) {
  var diff = (Date.now() - Date.parse(time)) / 3600000
  if (diff > 60) {
    return ['outdated', '过期']
  }

  if (_val < 7) {
    return ['often', '频繁']
  }
  

  return ['normal', '正常']
}