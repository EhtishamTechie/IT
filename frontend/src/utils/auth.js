// import jwtDecode from "jwt-decode";

// export const isTokenValid = () => {
//   const token = localStorage.getItem("token");
//   if (!token) return false;

//   try {
//     const { exp } = jwtDecode(token);
//     if (!exp) return false;

//     const now = Date.now() / 1000; // in seconds
//     return exp > now;
//   } catch {
//     return false;
//   }
// };
// import jwt_decode from "jwt-decode"; // ✅ correct name (not 'default')
import { jwtDecode } from "jwt-decode"; // ✅ named import
export const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    // const { exp } = jwt_decode(token);
    const { exp } = jwtDecode(token);

    if (!exp) return false;

    const now = Date.now() / 1000;
    return exp > now;
  } catch {
    return false;
  }
};
