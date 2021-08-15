$(function() {
  document.getElementById("respuestaSi").addEventListener("click", myScript);
  document.getElementById("respuestaNo").addEventListener("click", myScript);
});






function myScript() {

  var buttonOne = document.getElementById("respuestaSi");
  var buttonTwo = document.getElementById("respuestaNo");

  if (this.innerHTML == "No creo pero a ver") {

    if (buttonOne.innerHTML == "Si, si soy la neta") {
      buttonOne.innerHTML = "No creo pero a ver";
      buttonTwo.innerHTML = "Si, si soy la neta";
    }

    else if (buttonOne.innerHTML == "No creo pero a ver") {
      buttonOne.innerHTML = "Si, si soy la neta";
      buttonTwo.innerHTML = "No creo pero a ver";
    }
  }

  else {
    window.alert("Jajaja ya lo sabia alv te gusta el chile con chicata");
    $('#invisible').show();
  }
}
