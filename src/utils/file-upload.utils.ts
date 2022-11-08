import { extname } from "path";
import { FilePaths, FilePathsDirective } from "../files/constanst/paths";

export const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|txt)$/)) {
    return callback(new Error("Only image files are allowed!"), false);
  }
  callback(null, true);
};

export const appFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(apk)$/)) {
    return callback(new Error("Only apk files are allowed!"), false);
  }
  callback(null, true);
};

export const editFileName = (req, file, callback) => {
  const fileExtName = extname(file.originalname);
  callback(null, `${Date.now()}${fileExtName}`);
  return `${Date.now()}${fileExtName}`;
};

export const getPathToFile = (directive, id) => {
  const obj = (path) => ({
    clientPatchToFile: path.replace(/^\./, ""),
    serverPathToFile: path,
  });
  const { DEST, IMAGES, USERS, AVATARS, CHATS, AUDIOS } = FilePaths;
  if (directive === FilePathsDirective.USER_AVATAR) {
    return obj(`${DEST}/${USERS}/${id}/${AVATARS}`);
  }
  if (directive === FilePathsDirective.CHAT_AVATAR) {
    return obj(`${DEST}/${CHATS}/${id}/${AVATARS}`);
  }
  return null;
};
