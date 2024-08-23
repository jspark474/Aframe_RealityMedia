document.addEventListener('keydown', function (event) {
    const cameraEl = document.querySelector('#cameraRig');
    const rotation = cameraEl.getAttribute('rotation');

    // Check which key was pressed
    if (event.key === 'e' || event.key === 'E') {
      // Rotate left (decrease Y rotation)
      rotation.y -= 30;
    } else if (event.key === 'q' || event.key === 'Q') {
      // Rotate right (increase Y rotation)
      rotation.y += 30;
    }

    // Apply the new rotation
    cameraEl.setAttribute('rotation', rotation);
  });

  

//   var coll = document.getElementsByClassName("collapsible_test");
// console.log(coll);
// coll[0].addEventListener("click", function() {
//     this.classList.toggle("active");
//     var content = this.nextElementSibling;
//     console.log("here");
//     if (content.style.display === "block") {
//       content.style.display = "none";
//     } else {
//       content.style.display = "block";
//     }
//   });
