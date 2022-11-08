export const unAuthorizeResponse = () => {
  return {
    status: 401,
    socketData: null,
    data: {
      error: {
        code: 401,
        message: "Invalid credentials",
      },
    },
  };
};

export const badRequestResponse = (errorContent) => {
  return {
    status: 400,
    socketData: null,
    data: {
      error: {
        code: 400,
        message: errorContent,
      },
    },
  };
};

export const internalErrorResponse = (errorContent) => {
  return {
    status: 500,
    socketData: null,
    data: {
      error: {
        code: 500,
        message: errorContent,
      },
    },
  };
};

export const successResponse = (data, socketData?: any) => {
  return {
    status: 200,
    socketData: socketData,
    data: {
      data: data,
    },
  };
};
