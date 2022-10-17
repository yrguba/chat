export const unAuthorizeResponse = () => {
  return { status: 401, data: {
      error: {
        code: 401,
        message: "Invalid credentials"
      }
    }};
};

export const badRequestResponse = (errorContent) => {
  return { status: 400, data: {
      error: {
        code: 400,
        message: errorContent
      }
    }};
};

export const internalErrorResponse = (errorContent) => {
  return { status: 500, data: {
      error: {
        code: 500,
        message: errorContent
      }
    }};
};

export const successResponse = (data) => {
  return {
    status: 200,
    data: {
      data: data
    },
  };
};

