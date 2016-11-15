var APP;
var baseUrl = 'https://www.awesomes.cn/'
//var baseUrl = 'http://192.168.141.128:3000/'
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
      subs: [],
      isring: false,
      view: 'repos',
      categorys: [],
      current_url: undefined,
      addstatus: 'ready',
      checkedtyp: 1,
      i18: {
        search_txt: chrome.i18n.getMessage('search_txt')
      }
    },
    methods: {
      searchGo: function () {
        var keyword = APP.keyword.trim()
        if (keyword === '' || keyword[0] === ':') {
          changeKeyword()
          return 
        }

        listSearch()
      },
      addNewRepo: function () {
        if(!APP.current_url) { return }
        $.post(baseUrl + 'api/newrepo', {url: APP.current_url, typid: APP.checkedtyp}, function (data) {
          APP.addstatus = 'success'
        })
      },
      checkTyp: function (item) {
        APP.checkedtyp = item.id
      }

    },
    watch: {
      keyword: function () {
        changeKeyword()
      }
    },
    computed: {
      isListRepos: function () {
        return ['repos', 'tops', 'subrepos'].indexOf(this.view) > -1
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
      callback(data.items)
    })
  }, function (data) {
    APP.repos = groupRepos(data)
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
      callback(data.items)
    })
  }, function (data) {
    APP.repos = groupRepos(data)
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
      callback(data.items)
    })
  }, function (data) {
    APP.repos = groupRepos(data)
    APP.isring = false
  })
}

/**
 * 获取专题列表
 */


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
  APP.view = 'repos'
  cacheStoreFunc('awe-subrepo-' + subject, 1, function(callback) {
    APP.isring = true
    $.get(baseUrl + 'api/subrepos', {key: subject}, function(data) {
      data.items = processSubRepos(data.items)
      callback(data.items)
    })
  }, function (data) {
    APP.repos = groupSubjectRepos(data)
    APP.isring = false
  })
}

// 专题下的库归类
function groupSubjectRepos (items) {
  return items.reduce(function (result, item) {
    var key = item.rootyp + '-' + item.typcd
    var old = result.find(function(sub) {
      return sub.key === key
    })

    if (old) {
      old.items.push(item)
    } else {
      result.push({
        key: key,
        items: [item]
      })
    }

    return result

  }, [])
}


// 普通库的归类
function groupRepos (items) {
  items.forEach(function(item) {
    processRepo(item)
  })

  return [
    {
      key: 'normal',
      items: items
    }
  ]
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
      callback(dealTypes(data.items))
    })
  }, function (data) {
    APP.categorys = data
    APP.checkedtyp = data[0].items[0].id
  })
}

// 处理分类数据
function dealTypes (items) {
  var cates = []
  items.forEach(function (item) {
    var old = cates.find(function (cate) {
      return cate.key === item.rootyp
    })

    if (old) {
      old.items.push(item)
    } else {
      cates.push({
        key: item.rootyp,
        items: [item]
      })
    }
  })
  return cates
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