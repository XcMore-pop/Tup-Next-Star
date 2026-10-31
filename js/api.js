const API = {
  token: () => sessionStorage.getItem("party_token") || "",
  async call(action,payload={}) {
    const url = window.APP_CONFIG.API_URL;
    if (!url || url.includes("PASTE_YOUR")) throw new Error("กรุณาตั้งค่า API_URL ใน js/config.js ก่อน");
    const response = await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action,payload,token:this.token()})
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "เกิดข้อผิดพลาด");
    return result.data;
  },
  async login(username,password) {
    const result = await this.call("login",{username,password});
    sessionStorage.setItem("party_token",result.token);
    sessionStorage.setItem("party_user",JSON.stringify(result.user));
    return result.user;
  },
  async logout() {
    try { await this.call("logout"); } finally {
      sessionStorage.removeItem("party_token");
      sessionStorage.removeItem("party_user");
    }
  }
};
