
// PocketBase service removed. All state is now local.
export const pb = null as any;
export const logout = () => {
    localStorage.clear();
    window.location.reload();
};
