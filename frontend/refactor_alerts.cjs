const fs = require('fs');

const files = [
  "c:\\Study\\Projects\\AI_Test_Case_Generator\\frontend\\src\\pages\\Projects.jsx",
  "c:\\Study\\Projects\\AI_Test_Case_Generator\\frontend\\src\\pages\\LegacyWorkspace.jsx",
  "c:\\Study\\Projects\\AI_Test_Case_Generator\\frontend\\src\\pages\\Admin.jsx",
  "c:\\Study\\Projects\\AI_Test_Case_Generator\\frontend\\src\\context\\ProjectWorkspaceContext.jsx",
  "c:\\Study\\Projects\\AI_Test_Case_Generator\\frontend\\src\\components\\projects\\NewProjectForm.jsx"
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace confirm(...)
  content = content.replace(/if\s*\(\!window\.confirm\((['"`].+?['"`])\)\)\s*return;/g, 
    "const result = await Swal.fire({\n      title: 'Are you sure?',\n      text: $1,\n      icon: 'warning',\n      showCancelButton: true,\n      confirmButtonText: 'Yes'\n    });\n    if (!result.isConfirmed) return;");

  content = content.replace(/if\s*\(\!confirm\((['"`].+?['"`])\)\)\s*return/g, 
    "const result = await Swal.fire({\n      title: 'Are you sure?',\n      text: $1,\n      icon: 'warning',\n      showCancelButton: true,\n      confirmButtonText: 'Yes'\n    });\n    if (!result.isConfirmed) return");
    
  // Replace alert(...)
  content = content.replace(/window\.alert\((.+?)\)/g, "Swal.fire($1)");
  content = content.replace(/alert\((.+?)\)/g, "Swal.fire({\n      title: $1,\n      icon: 'info',\n      confirmButtonText: 'OK'\n    })");

  // Add import if not present and if Swal is used
  if (content.includes('Swal.fire') && !content.includes("import Swal from 'sweetalert2'")) {
    content = "import Swal from 'sweetalert2';\n" + content;
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
