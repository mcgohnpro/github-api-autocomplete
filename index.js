const input = document.querySelector('.app-window__input');
const select = document.querySelector('.app-window__select');
const selectedRepos = document.querySelector('.selected-repos');
const appWindow = document.querySelector('.app-window');

const cashedRepos = Object.fromEntries(
  JSON.parse(localStorage.getItem('repos')) || [],
);

(function () {
  if (Object.keys(cashedRepos).length) {
    for (let id in cashedRepos) {
      selectedRepos.appendChild(renderFavoriteRepo(id));
    }
  }
})();

class ErrorRequestApi extends Error {
  constructor(message, resp) {
    super(message);
    this.name = this.constructor.name;
    this.response = resp;
  }
}

class ApiGitHubRequest {
  constructor(url) {
    this.url = new URL(url);
    this.url.searchParams.set('per_page', 5);
  }

  request(repoName) {
    this.repos = null;
    if (!repoName) {
      this.repos = null;
      return;
    }
    this.url.searchParams.set('q', repoName);
    return fetch(this.url)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          const err = new ErrorRequestApi(
            `Error status code (${response.status}) \nResponse:`,
            response,
          );
          throw err;
        }
      })
      .then((json) => {
        this.repos = json.items.reduce((acc, element) => {
          acc[element.id] = {
            name: element.name,
            owner: element.owner.login,
            stars: element.stargazers_count,
          };
          return acc;
        }, {});
      });
  }
}

const debounce = (fn, debounceTime) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, debounceTime);
  };
};

function showHideSelectElements() {
  if (select.children.length) {
    select.size = select.children.length;
    select.hidden = false;
  } else {
    select.hidden = true;
    select.size = 0;
  }
}

function createElementsFromJson(repos) {
  if (repos) {
    let resultItems = document.createDocumentFragment();
    Object.entries(repos).forEach(([id, { name }]) => {
      let item = document.createElement('option');
      item.classList.add('app-window__option');
      item.value = id;
      item.innerText = name;
      resultItems.appendChild(item);
    });
    return resultItems;
  }
}

function renderFavoriteRepo(id) {
  const fragment = document
    .getElementById('text-template')
    .cloneNode(true).content;
  fragment.querySelector('.selected-repos__wrapper').id = id;
  fragment.querySelector(
    '.selected-repos__attribute:nth-child(1)',
  ).textContent = `Name: ${cashedRepos[id]['name']}`;
  fragment.querySelector(
    '.selected-repos__attribute:nth-child(2)',
  ).textContent = `Owner: ${cashedRepos[id]['owner']}`;
  fragment.querySelector(
    '.selected-repos__attribute:nth-child(3)',
  ).textContent = `Stars: ${cashedRepos[id]['stars']}`;
  return fragment;
}

function addToFavoriteRepo(id) {
  if (cashedRepos[id]) return;
  cashedRepos[id] = apiRepoRequest.repos[id];
  localStorage.setItem('repos', JSON.stringify(Object.entries(cashedRepos)));
  selectedRepos.appendChild(renderFavoriteRepo(id));
}

function deleteFromFavoriteRepo(id) {
  if (!cashedRepos[id]) return;
  delete cashedRepos[id];
  localStorage.setItem('repos', JSON.stringify(Object.entries(cashedRepos)));
}

const inputChangeHandler = debounce((event) => {
  select.hidden = true;
  select.replaceChildren();
  if (!event.target.value) {
    return;
  }
  apiRepoRequest
    .request(event.target.value)
    .then(() => createElementsFromJson(apiRepoRequest.repos))
    .then((findedElements) => {
      select.appendChild(findedElements);
      showHideSelectElements();
    })
    .catch((err) => {
      if (err instanceof ErrorRequestApi) {
        console.error(`${err.name}: ${err.message}`);
        alert(`Request Error, Code: ${err.response.status}`);
      } else throw err;
    });
}, 600);

const apiRepoRequest = new ApiGitHubRequest(
  'https://api.github.com/search/repositories',
);

input.addEventListener('input', inputChangeHandler);

select.addEventListener('click', (event) => {
  input.value = '';
  select.hidden = true;
  addToFavoriteRepo(event.target.value);
});

appWindow.addEventListener('click', (event) => {
  const element = event.target;

  if (element.classList.contains('close')) {
    const parent = element.closest('.selected-repos__wrapper');
    deleteFromFavoriteRepo(parent.id);
    parent.remove();
  }
});
