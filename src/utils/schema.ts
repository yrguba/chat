export const getUserSchema = (userData) => {
    return {
        id: userData.id || "",
        phone: userData.phone || "",
        name: userData.name || "",
        nickname: userData.nickname || "",
        email: userData.email || "",
        birth: userData.birth || "",
        avatar: userData.avatar || "",
        contactName: userData.contactName || "",
        last_active: userData.last_active || "",
        is_online: userData.is_online || false,
    }
};
