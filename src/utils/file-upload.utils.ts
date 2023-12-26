import { FilePaths, FilePathsDirective } from "../files/constanst/paths";
import * as fs from "fs";

export const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|txt)$/)) {
    return callback(new Error("Only image files are allowed!"), false);
  }
  callback(null, true);
};

export const imageTypeCheck = (file) => {
  return file.originalname.match(/\.(jpg|jpeg|png|PNG|gif)$/);
};

export const videoTypeCheck = (file) => {
  return file.originalname.match(/\.(mp4|ogg|ogv|webm|mov)$/);
};

export const audioTypeCheck = (file) => {
  return file.originalname.match(/\.(ogg|vorbis|wav|mp3|webm)$/);
};

export const desktopReleaseTypeCheck = (fileName) => {
  return (
    (/tar.gz/.test(fileName) || /msi.zip/.test(fileName)) &&
    fileName.split(".").pop() !== "sig"
  );
};

export const documentTypeCheck = (file) => {
  return file.originalname.match(
    /\.(txt|rtf|doc|docx|html|pdf|odt|ppt|pptx|xls|xlsx)$/
  );
};

export const messageFileFilter = (req, file, callback) => {
  if (
    imageTypeCheck(file) ||
    videoTypeCheck(file) ||
    audioTypeCheck(file) ||
    documentTypeCheck(file)
  ) {
    return callback(null, true);
  }
  return callback(new Error("недопустимый формат"), false);
};

export const privacyPolicyFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(html)$/)) {
    return callback(new Error("Only html files are allowed!"), false);
  }
  callback(null, true);
};

export const portableVersionFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(exe)$/)) {
    return callback(new Error("Only exe files are allowed!"), false);
  }
  callback(null, true);
};

export const windowsAppFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(zip)$/)) {
    return callback(new Error("Only zip files are allowed!"), false);
  }
  callback(null, true);
};

export const macAppFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(gz)$/)) {
    return callback(new Error("Only gz files are allowed!"), false);
  }
  callback(null, true);
};

export const appFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(apk)$/)) {
    return callback(new Error("Only apk files are allowed!"), false);
  }
  callback(null, true);
};

const snakeCase = (action: "encode" | "decode", str: string) => {
  if (action === "encode") return str.split(" ").join("_");
  return str.split("_").join(" ");
};

export const getFileInfo = (filePath: string) => {
  const name = filePath.includes("&$&") ? filePath.split("&$&").pop() : "";
  const size = (fs.statSync(`.${filePath}`).size / (1024 * 1024)).toFixed(2);
  return {
    name: name ? snakeCase("decode", name) : "unknown",
    extension: `.${filePath.split(".").pop()}`,
    size: Number(size),
    url: filePath.replace(/^\./, ""),
  };
};

export const checkFileInDb = (filePath: string) => {
  return !!fs.statSync(`.${filePath}`).isFile();
};

export const editFileName = (req, file, callback) => {
  const originalName = snakeCase(
    "encode",
    Buffer.from(file.originalname, "latin1").toString("utf8")
  );
  callback(null, `${Date.now()}&$&${originalName}`);
  return `${Date.now()}&$&${originalName}`;
};

export const getPathToFile = (directive, id) => {
  const obj = (path) => ({
    clientPatchToFile: path.replace(/^\./, ""),
    serverPathToFile: path,
  });
  const {
    DEST,
    IMAGES,
    USERS,
    AVATARS,
    CHATS,
    AUDIOS,
    MESSAGES,
    VOICES,
    VIDEOS,
    DOCUMENTS,
  } = FilePaths;
  if (directive === FilePathsDirective.USER_AVATAR) {
    return obj(`${DEST}/${USERS}/${id}/${AVATARS}`);
  }
  if (directive === FilePathsDirective.CHAT_AVATAR) {
    return obj(`${DEST}/${CHATS}/${id}/${AVATARS}`);
  }
  if (directive === FilePathsDirective.CHAT_MESSAGES_AUDIOS) {
    return obj(`${DEST}/${CHATS}/${id}/${MESSAGES}/${AUDIOS}`);
  }
  if (directive === FilePathsDirective.CHAT_MESSAGES_VIDEOS) {
    return obj(`${DEST}/${CHATS}/${id}/${MESSAGES}/${VIDEOS}`);
  }
  if (directive === FilePathsDirective.CHAT_MESSAGES_IMAGES) {
    return obj(`${DEST}/${CHATS}/${id}/${MESSAGES}/${IMAGES}`);
  }
  if (directive === FilePathsDirective.CHAT_MESSAGES_VOICES) {
    return obj(`${DEST}/${CHATS}/${id}/${MESSAGES}/${VOICES}`);
  }
  if (directive === FilePathsDirective.CHAT_MESSAGES_DOCUMENTS) {
    return obj(`${DEST}/${CHATS}/${id}/${MESSAGES}/${DOCUMENTS}`);
  }
  return null;
};

export const usersFilesAccessVerify = (userId, filepath) => {
  const words = filepath.split("/");
  const findIndex = words.findIndex((word) => word === "users");
  if (findIndex === -1) return false;
  const ownerId = Number(words[findIndex + 1]);
  return Number(userId) === ownerId;
};
