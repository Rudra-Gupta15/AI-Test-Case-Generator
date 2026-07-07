const fs = require('fs');

const filePath = "c:\\\\Study\\\\Projects\\\\AI_Test_Case_Generator\\\\frontend\\\\src\\\\pages\\\\LegacyWorkspace.jsx";
let content = fs.readFileSync(filePath, 'utf-8');

// Insert the handler functions before startAnalysis
const handlerFunctions = `
  const handleRemoveFile = (fileName, setter) => {
    Swal.fire({
      title: "Remove File?",
      text: \`Are you sure you want to remove \${fileName}?\`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#cbd5e1",
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setter(null);
      }
    });
  };

  const handleRemoveImage = (index) => {
    Swal.fire({
      title: "Remove Image?",
      text: "Are you sure you want to remove this image?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#cbd5e1",
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setImages(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const startAnalysis`;

content = content.replace("  const startAnalysis", handlerFunctions);

// Replace the inline setters with handleRemoveFile
content = content.replace(/onClick=\{\(\) => setBrd\(null\)\}/g, "onClick={() => handleRemoveFile(brd.name, setBrd)}");
content = content.replace(/onClick=\{\(\) => setFsd\(null\)\}/g, "onClick={() => handleRemoveFile(fsd.name, setFsd)}");
content = content.replace(/onClick=\{\(\) => setSrs\(null\)\}/g, "onClick={() => handleRemoveFile(srs.name, setSrs)}");
content = content.replace(/onClick=\{\(\) => setFrd\(null\)\}/g, "onClick={() => handleRemoveFile(frd.name, setFrd)}");

// Replace image removal
content = content.replace(/onClick=\{\(\) => setImages\(images\.filter\(\(\_, i\) => i !== index\)\)\}/g, "onClick={() => handleRemoveImage(index)}");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done LegacyWorkspace.jsx');
