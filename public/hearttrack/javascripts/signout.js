$(function() {
  $("#signout").click(function() {
    window.localStorage.removeItem("authToken");
    window.location.replace("signin.html");
  })
})