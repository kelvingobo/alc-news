let closeBtn = document.querySelector('.closeBtn');
let favBtn = document.querySelector("#fav");
let wrapper = document.querySelector("#wrapper");
let country = "ng";
let source = "sources";
let modalSection = document.querySelector('#simple-modal');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .then(() => { 
      console.log('Service Worker Registered'); 
    }).catch((err) => {
      console.log("Service Worker failed to Register with error: " + err);
    });
}

var OpenIDB = () => {
  return idb.open('alc-news-db', 3, function(upgradeDb) {
    switch(upgradeDb.oldVersion) {
      case 0:
        
      case 1:
        const alcNews = upgradeDb.createObjectStore('alc-news', {keyPath: 'publishedAt'});
        alcNews.createIndex('time-index', 'publishedAt');
      case 2:
        const favNews = upgradeDb.createObjectStore('fav-news', {keyPath: 'title'});
        favNews.createIndex('fav-index', 'title');
    }
  });
}

function fetchNews(country) {
  fetch(`https://newsapi.org/v2/top-headlines?country=${country}&apiKey=b171349b7d754710b8976f23a9192fa2`)
    .then(response => response.json())
    .then(result => {
      OpenIDB().then(db => {
        var tx = db.transaction('alc-news', 'readwrite');
        var store = tx.objectStore('alc-news');
        result.articles.map(article => {
          return store.put(article);
        });
        store.index('time-index').openCursor(null, 'prev').then(cursor => {
          return cursor.advance(30);
        }).then(function deleteRest(cursor){
          if (!cursor) return;
          cursor.delete();
          return cursor.continue().then(deleteRest);
        });
      });
      loadPosts(result.articles);

      document.querySelectorAll('#fav-icon').forEach(icon => {
        icon.addEventListener('click', () => {
          icon.style.color = "#ac193d"
          OpenIDB().then(db => {
            var tx = db.transaction('fav-news', 'readwrite');
            var favStore = tx.objectStore('fav-news');
            result.articles.map(article => {
              if (icon.parentElement.nextElementSibling.href == article.url) {
                favStore.put(article);
              }
            });
            favStore.index('fav-index').openCursor(null, 'prev').then(cursor => {
              return cursor.advance(10);
            }).then(function deleteRest(cursor) {
              if(!cursor) return;
              cursor.delete();
              return cursor.continue().then(deleteRest);
            });
          });
        });
      });
    });
}

function displayFavPosts() {
  return OpenIDB().then(db => {
    var index = db.transaction('fav-news').objectStore('fav-news').index('fav-index');
    return index.getAll().then(favs => {
      if (favs.length == 0) {
        document.querySelector('#fav-posts-saved').innerHTML = `<h5 style="color: #fff;">Favouraites Store Empty</h5>`;
        return;
      }
      document.querySelector('#fav-posts-saved').innerHTML ='<ul class="collection with-header">' + 
      '<li class="collection-header"><h5>Favourite articles</h5></li>' + favs.sort((a,b) => a>b ? 1 : -1).map(fav => `<li class="collection-item"><a href="${fav.url}">${fav.title}</a></li>`).join("") + '</ul>';
    });
  });
}

function showCachedArticles() {
  return OpenIDB().then(db => {
    var index = db.transaction('alc-news').objectStore('alc-news').index('time-index');
    return index.getAll().then(articles => {
      loadPosts(articles.reverse());
    });
  });
}

function newsFromSource(source) {
  fetch(`https://newsapi.org/v2/${source}?apiKey=b171349b7d754710b8976f23a9192fa2`)
    .then(response => response.json())
    .then(results => {
      document.querySelector("#search_nav").innerHTML = `<option>Select news source... </option>` + results.sources.map(result => `<option value="${result.name}">${result.name}</option>`).join("");
    });
}

function formattingTime(postTime) {
  return postTime.split("").filter(timeChar => {
    if (timeChar != "T" && timeChar != "Z") {
      return timeChar;
    }
  }).join("");
}

function loadPosts(posts) {
  wrapper.innerHTML = posts.map(post => `
  <div class="col s12 m7">
    <div class="card">
      <div class="card-image">
        <img src="${post.urlToImage}">
        <i class="small material-icons right" id="fav-icon" style="padding: 10px; cursor: pointer;">favorite</i>
        <p class="btn-flat disabled" id="post-detail">${post.source.name}</p><br>
        <p class="btn-flat disabled" id="post-detail">${formattingTime(post.publishedAt)}</p>
      </div>
      <a href="${post.url}" target="_blank">
        <div class="card-stacked">
          <div class="card-content">
            <h5>${post.title}</h5>
            <p>${post.description}</p>
          </div>
        </div>
      </a>
    </div>
  </div>`
  ).join("");
}

document.querySelector("#search_nav").addEventListener('change', (e) => {
  fetch(`https://newsapi.org/v2/everything?sources=${e.target.value}&apiKey=b171349b7d754710b8976f23a9192fa2`)
    .then(response => response.json())
    .then(data => {
      loadPosts(data.articles);
    });
});

document.querySelector("#source-search").addEventListener('click', () => {
  document.querySelector("#search_nav").style.display = "block";
  document.querySelector("#country_nav").style.display = "none";
});

document.querySelector("#countries-list").addEventListener('click', () => {
  document.querySelector("#search_nav").style.display = "none";
  document.querySelector("#country_nav").style.display = "block";
});

window.addEventListener('load', () => {
  showCachedArticles();
  fetchNews(country);
  document.querySelector("#search_nav").style.display = "none";
  document.querySelectorAll(".countries").forEach(country => country.style.display = "none");
  newsFromSource(source);
});

document.querySelector("#country_nav").addEventListener('change', e => {
  fetchNews(e.target.value);
});

favBtn.addEventListener('click', () => {
  modalSection.style.display = "block";
  displayFavPosts();
});

closeBtn.addEventListener('click', () => {
  modalSection.style.display = "none";
});

window.addEventListener('click', e => {
  if (e.target == modalSection) {
    modalSection.style.display = "none";
  }
});