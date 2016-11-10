var APP;
var baseUrl = 'http://192.168.26.128:2000/'
var keymap = {
  'top': listTop,
  's': listSubject,
  '+': showAddNewRepo,
  'clear': clearCache
}
$(function () {
  APP = new Vue({
    el: 'body',
    data: {
      keyword: store.get('aweb-keyword'), 
      repos: [],
      subrepos: [],
      subs: [],
      isring: false,
      view: 'repos',
      categorys: [],
      current_url: undefined,
      addstatus: 'ready',
      i18: {
         search_txt: chrome.i18n.getMessage('search_txt')
      }
    },
    methods: {
      searchGo () {
        var keyword = APP.keyword.trim()
        if (keyword === '' || keyword[0] === ':') {
          changeKeyword()
          return 
        }

        listSearch()
      },
      addNewRepo: function () {
        if(!APP.current_url) { return }
        var typs = APP.category.split('-')
        $.post(baseUrl + 'api/newrepo', {url: APP.current_url, rootyp: typs[0], typcd: typs[1]}, function (data) {
          APP.addstatus = 'success'
        })
      }

    },
    watch: {
      keyword: function () {
        changeKeyword()
      }
    },
    computed: {
      isListRepos: function () {
        return ['repos', 'tops', 'subrepos'].indexOf(APP.view) > -1
      }
    }
  })

  init() 
})


function changeKeyword() {
  APP.keyword = APP.keyword.trim()
  store.set('aweb-keyword', APP.keyword)
  if (APP.keyword === '') {
    listLatest()
  }

  if (APP.keyword[0] === ':') {
    var cmds = APP.keyword.split(':')
    var func = keymap[cmds[1]]
    if (typeof func === 'function') {
      func(cmds[2])
    } else {
      APP.view = 'help'
    }
  }
}


/**
**/
function init () {
  getCurrentTabUrl(function (url) {
    url = /^https:\/\/github.com\/[^\/]+\/[^\/]+/.exec(url)
    if(url) {
      APP.current_url = url[0]
    }
  })

  APP.searchGo()
}


/**
 * 获取最新的框架
 */
function listLatest () {
  APP.view = 'repos'
  cacheStoreFunc('awe-latestrepos', 0.5, function(callback) {
    APP.isring = true
    $.get(baseUrl + 'api/latest', {}, function(data) {
      data.items.forEach(function(item) {
        processRepo(item)
      })
      callback(data.items)
    })
  }, function (data) {
    APP.repos = data
    APP.isring = false
  })
}


/**
 * 搜索结果
 */
function listSearch () {
  APP.view = 'repos'

  cacheStoreFunc('awe-search-' +  APP.keyword, 1, function(callback) {
    APP.isring = true
    $.get(baseUrl + 'api/search?q=' + APP.keyword, {}, function(data) {
      data.items.forEach(function(item) {
        processRepo(item)
      })
      callback(data.items)
    })
  }, function (data) {
    APP.repos = data
    APP.isring = false
  })
}

/**
 * 获取前端top 100
 */
function listTop () {
  APP.view = 'tops'
  cacheStoreFunc('awe-tops', 0.5, function(callback) {
    APP.isring = true
    $.get(baseUrl + 'api/top', {}, function(data) {
      data.items.forEach(function(item) {
        processRepo(item)
      })
      callback(data.items)
    })
  }, function (data) {
    APP.repos = data
    APP.isring = false
  })
}

/**
 * 获取专题列表
 */

function listAboutSubject (subject) {
  
}
function listSubject (subject) {
  cacheStoreFunc('awe-subjects', 1, function(callback) {
    APP.isring = true
    $.get(baseUrl + 'api/subjects', {}, function(data) {
      data.items.forEach(function(item) {
        processRepo(item)
      })
      callback(data.items)
    })
  }, function (data) {
    APP.subs = data
    APP.isring = false

    if (subject) {
      var mps = APP.subs.filter(function (item) {
        return item.key.toLowerCase().indexOf(subject) === 0
      })

      if (APP.subs.length === 0 || mps.length === 1) {
        listSubjectRepos(mps[0].key)
        return
      }
    } else {
      APP.view = 'subject'
    }
  })
}


/**
 * 获取某个主题的所有库
 */

function listSubjectRepos (subject) {
  console.log('===', subject)
  APP.view = 'subrepos'
  cacheStoreFunc('awe-subrepo-' + subject, 1, function(callback) {
    APP.isring = true
    $.get(baseUrl + 'api/subrepos', {key: subject}, function(data) {
      data.items = processSubRepos(data.items)
      callback(data.items)
    })
  }, function (data) {
    APP.subrepos = data
    APP.isring = false
  })
}


/**
 * 提交库
 */

function showAddNewRepo () {
  APP.view = 'add'
  getAllTyps() 
}


// 获取分类
function getAllTyps () {
  cacheStoreFunc('awe-categorys', 3, function(callback) {
    $.get(baseUrl + 'api/categorys', {}, function(data) {
      callback(data.items)
    })
  }, function (data) {
    APP.categorys = data
    APP.category = data[0].key
  })
}


/**
 * 清空缓存
 */
function clearCache () {
  ['awe-categorys', 'awe-latestrepos', 'awe-tops', 'awe-subjects'].forEach(function(key) {
    store.remove(key)
  })
}

/**
 * 处理框架列表的每一项
 */
function processRepo (item) {
  item.fresh = freshData(item.pushed_at)
  item.trend = trendData(item.trend)
}

/**
 * 处理专题下面的框架
 */

function processSubRepos (items) {
  var subjects = []
  items.forEach(function (item) {
    processRepo(item)
    var key = item.rootyp + '-' + item.typcd
    var subject = subjects.find(function (item) {
      return item.key === key
    })
    if (subject) {
      subject.repos.push(item)
    } else {
      subjects.push({
        key: key,
        repos: [item]
      })
    }
  })
  return items
}


// 计算更新频率
function freshData (time) {
  var diff = (Date.now() - Date.parse(time)) / (3600000 * 24)
  if (diff > 60) {
    return ['outdated', '过期']
  }

  if (diff < 7) {
    return ['often', '频繁']
  }
  

  return ['normal', '正常']
}


// 计算趋势
function trendData (trend) {
  if(trend >= 60) {
    return 3
  }

  if(trend >= 30) {
    return 2
  }

  if(trend > 0) {
    return 1
  }

  return 0
}


/**
 * 缓存策略
 */

function cacheStoreFunc (key, exp, func, callback) {
  var old = cacheStore.get(key)
  //if(!old) {
  if(true) {
    func(function(data) {
      cacheStore.set(key, data, exp)
      callback(data)
    })
  } else {
    callback(old)
  }
}


var cacheStore = {
    set: function(key, val, exp) {
        exp = exp * 24 * 3600 * 1000
        store.set(key, { val:val, exp: exp, time:new Date().getTime() })
    },
    get: function(key) {
        var info = store.get(key)
        if (!info) { return null }
        if (new Date().getTime() - info.time > info.exp) {
          store.remove(key)
          return null
        }
        return info.val
    }
}