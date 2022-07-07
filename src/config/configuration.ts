export default () => ({
  keys: {
    privateKey: process.env.PRIVATE_KEY.replace(/\\n/gm, '\n'),
    publicKey: process.env.PUBLIC_KEY.replace(/\\n/gm, '\n'),
    secret: process.env.SECRET.replace(/\\n/gm, '\n'),
  },
});
