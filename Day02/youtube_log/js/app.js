const STORAGE_KEY = "youtubeLearningLog";

const urlForm = document.getElementById("urlForm");
const youtubeUrlInput = document.getElementById("youtubeUrl");
const clearUrlButton = document.getElementById("clearUrlButton");
const videoTagsInput = document.getElementById("videoTags");
const formMessage = document.getElementById("formMessage");
const videoList = document.getElementById("videoList");
const emptyMessage = document.getElementById("emptyMessage");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const todoCount = document.getElementById("todoCount");
const clearDoneButton = document.getElementById("clearDoneButton");

let videos = loadVideos();

function loadVideos() {
  const savedVideos = localStorage.getItem(STORAGE_KEY);

  if (!savedVideos) {
    return [];
  }

  try {
    return JSON.parse(savedVideos);
  } catch {
    return [];
  }
}

function saveVideos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

function isYoutubeUrl(url) {
  return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be");
}

function getYoutubeVideoId(urlText) {
  const url = new URL(urlText);

  if (url.hostname.includes("youtu.be")) {
    return url.pathname.split("/").filter(Boolean)[0] || "";
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v") || "";
  }

  if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
    return url.pathname.split("/").filter(Boolean)[1] || "";
  }

  return "";
}

function getThumbnailUrl(urlText) {
  const videoId = getYoutubeVideoId(urlText);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

function normalizeUrl(value) {
  const url = new URL(value.trim());

  if (!isYoutubeUrl(url)) {
    throw new Error("YouTube 주소만 저장할 수 있습니다.");
  }

  return url.href;
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function fetchVideoTitle(url) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetch(oembedUrl);

  if (!response.ok) {
    throw new Error("영상 제목을 가져오지 못했습니다.");
  }

  const data = await response.json();
  return data.title || url;
}

function setFormMessage(text, isError = false) {
  formMessage.textContent = text;
  formMessage.classList.toggle("error", isError);
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createVideo(url, title, tags) {
  return {
    id: createId(),
    url,
    title,
    tags,
    thumbnailUrl: getThumbnailUrl(url),
    done: false,
    createdAt: new Date().toISOString(),
  };
}

function formatDate(isoText) {
  const date = new Date(isoText);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function updateSummary() {
  const doneVideos = videos.filter((video) => video.done);

  totalCount.textContent = videos.length;
  doneCount.textContent = doneVideos.length;
  todoCount.textContent = videos.length - doneVideos.length;
}

function renderVideos() {
  videoList.innerHTML = "";
  emptyMessage.classList.toggle("visible", videos.length === 0);

  videos.forEach((video) => {
    const item = document.createElement("li");
    item.className = video.done ? "video-item done" : "video-item";

    const thumbnailUrl = video.thumbnailUrl || getThumbnailUrl(video.url);
    const thumbnailLink = document.createElement("a");
    thumbnailLink.className = "thumbnail-link";
    thumbnailLink.href = video.url;
    thumbnailLink.target = "_blank";
    thumbnailLink.rel = "noopener noreferrer";

    if (thumbnailUrl) {
      const thumbnailImage = document.createElement("img");
      thumbnailImage.className = "thumbnail-image";
      thumbnailImage.src = thumbnailUrl;
      thumbnailImage.alt = "";
      thumbnailImage.loading = "lazy";
      thumbnailLink.appendChild(thumbnailImage);
    } else {
      thumbnailLink.classList.add("thumbnail-fallback");
      thumbnailLink.textContent = "▶";
    }

    const main = document.createElement("div");
    main.className = "video-main";

    const link = document.createElement("a");
    link.className = "video-link";
    link.href = video.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = video.title || video.url;

    const urlText = document.createElement("p");
    urlText.className = "video-url";
    urlText.textContent = video.url;

    const tags = Array.isArray(video.tags) ? video.tags : [];
    const tagList = document.createElement("div");
    tagList.className = "tag-list";

    tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.className = "tag";
      tagElement.textContent = `#${tag}`;
      tagList.appendChild(tagElement);
    });

    const meta = document.createElement("p");
    meta.className = "video-meta";
    meta.textContent = `${formatDate(video.createdAt)} 저장`;

    const actions = document.createElement("div");
    actions.className = "video-actions";

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = video.done ? "icon-button complete-button active" : "icon-button complete-button";
    completeButton.textContent = video.done ? "완료됨" : "완료";
    completeButton.addEventListener("click", () => toggleDone(video.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete-button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deleteVideo(video.id));

    main.appendChild(link);
    main.appendChild(urlText);
    if (tags.length > 0) {
      main.appendChild(tagList);
    }
    main.appendChild(meta);
    actions.appendChild(completeButton);
    actions.appendChild(deleteButton);
    item.appendChild(thumbnailLink);
    item.appendChild(main);
    item.appendChild(actions);
    videoList.appendChild(item);
  });

  updateSummary();
}

async function fillMissingTitles() {
  const videosWithoutTitle = videos.filter((video) => !video.title || video.title === video.url);

  if (videosWithoutTitle.length === 0) {
    return;
  }

  let hasUpdatedTitle = false;

  for (const video of videosWithoutTitle) {
    try {
      const title = await fetchVideoTitle(video.url);
      video.title = title;
      video.thumbnailUrl = getThumbnailUrl(video.url);
      hasUpdatedTitle = true;
    } catch {
      video.title = video.url;
      video.thumbnailUrl = getThumbnailUrl(video.url);
    }
  }

  if (hasUpdatedTitle) {
    saveVideos();
    renderVideos();
  }
}

async function addVideo(url, tags) {
  const alreadySaved = videos.some((video) => video.url === url);

  if (alreadySaved) {
    setFormMessage("이미 저장된 URL입니다.", true);
    return;
  }

  setFormMessage("영상 제목을 가져오는 중입니다.");

  let title = url;

  try {
    title = await fetchVideoTitle(url);
  } catch {
    title = url;
  }

  videos = [createVideo(url, title, tags), ...videos];
  saveVideos();
  renderVideos();
  youtubeUrlInput.value = "";
  videoTagsInput.value = "";
  setFormMessage("저장되었습니다. 목록에서 클릭하면 새 창으로 열립니다.");
}

function toggleDone(id) {
  videos = videos.map((video) => (
    video.id === id ? { ...video, done: !video.done } : video
  ));
  saveVideos();
  renderVideos();
}

function deleteVideo(id) {
  videos = videos.filter((video) => video.id !== id);
  saveVideos();
  renderVideos();
}

function clearDoneVideos() {
  videos = videos.filter((video) => !video.done);
  saveVideos();
  renderVideos();
}

urlForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const url = normalizeUrl(youtubeUrlInput.value);
    const tags = parseTags(videoTagsInput.value);
    await addVideo(url, tags);
  } catch (error) {
    setFormMessage(error.message || "올바른 URL을 입력하세요.", true);
  }
});

clearDoneButton.addEventListener("click", clearDoneVideos);
clearUrlButton.addEventListener("click", () => {
  youtubeUrlInput.value = "";
  youtubeUrlInput.focus();
  setFormMessage("YouTube 또는 youtu.be 주소를 입력하세요.");
});

renderVideos();
fillMissingTitles();
