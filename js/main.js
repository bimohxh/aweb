var APP;
$(function () {
  APP = new Vue({
    el: 'body',
    data: {
      repos: [],
      isring: false
    },
    methods: {
      submit () {
        var keyword = APP.keyword
        if (keyword.trim() === '') {
          listLatest()
        } else {
          listSearch()
        }
      }
    }
  })


  listLatest()
})

function listLatest() {
  var storeList = store.get('latestrepos')
  if (storeList) {
    APP.repos = storeList
    return
  } else {
    APP.isring = true
  }
  
  $.get('http://192.168.141.128:3000/api/latest', {}, function(data) {
    data.items.forEach(function(item) {
      item.fresh = freshData(item.pushed_at)
    })
    if (!storeList) {
      APP.repos = data.items
      APP.isring = false
    }
    store.set('latestrepos', data.items)
    
  })
}



function listSearch() {
  APP.isring = true
  $.get('http://192.168.141.128:3000/api/search?q=' + APP.keyword, {}, function(data) {
    data.items.forEach(function(item) {
      item.fresh = freshData(item.pushed_at)
    })
    APP.repos = data.items
    APP.isring = false
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