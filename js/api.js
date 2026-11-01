const API = {
  token: () => sessionStorage.getItem("party_token") || "",
  async call(action,payload={}) {
    const url = window.APP_CONFIG.API_URL;
    if (!url || url.includes("PASTE_YOUR")) throw new Error("กรุณาตั้งค่า API_URL ใน js/config.js ก่อน");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
      response = await fetch(url,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action,payload,token:this.token()}),
        signal:controller.signal
      });
    } catch (error) {
      if (error.name === "AbortError") throw new Error("ระบบใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
      throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
    } finally {
      clearTimeout(timeoutId);
    }
    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error("ระบบตอบกลับไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"); }
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
