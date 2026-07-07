const fs = require('fs');
const path = require('path');

const filePath = "c:\\\\Study\\\\Projects\\\\AI_Test_Case_Generator\\\\frontend\\\\src\\\\pages\\\\LegacyWorkspace.jsx";
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace the state
content = content.replace("  const [executionPopup, setExecutionPopup] = useState(null)\n", "");

// 2. Replace instances of setExecutionPopup
content = content.replace(
  /setExecutionPopup\(\{ message: "Please select at least one test case to execute.", error: true \}\);/g,
  `Swal.fire({
      title: "Warning",
      text: "Please select at least one test case to execute.",
      icon: "warning",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });`
);

content = content.replace(
  /setExecutionPopup\(\{ message: `Successfully executed \$\{selectedIds\.length\} test case\(s\)!` \}\);/g,
  `Swal.fire({
      title: "Success",
      text: \`Successfully executed \$\{selectedIds.length\} test case(s)!\`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });`
);

content = content.replace(
  /setExecutionPopup\(\{ message: `Successfully executed 1 test case!` \}\);/g,
  `Swal.fire({
      title: "Success",
      text: "Successfully executed 1 test case!",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });`
);

content = content.replace(
  /setExecutionPopup\(\{ message: 'Execution completed successfully!' \}\);/g,
  `Swal.fire({
      title: "Success",
      text: "Execution completed successfully!",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#10b981"
    });`
);

// 3. Remove the JSX block
const jsxBlock = `{executionPopup && (
        <div className="preview-modal-overlay" onClick={() => setExecutionPopup(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', height: 'auto', textAlign: 'center' }}>
            <div className="preview-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ color: executionPopup.error ? '#ef4444' : '#10b981', margin: '0 auto', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {executionPopup.error ? <i className="fa-solid fa-triangle-exclamation"></i> : <i className="fa-solid fa-circle-check"></i>}
                {executionPopup.error ? 'Warning' : 'Success'}
              </h3>
              <button className="close-modal-btn" onClick={() => setExecutionPopup(null)} style={{ position: 'absolute', right: '16px', top: '16px' }}>✕</button>
            </div>
            <div className="preview-modal-body" style={{ padding: '24px 20px 32px 20px' }}>
              <p style={{ fontSize: '15px', color: '#475569', margin: '0 0 24px 0', lineHeight: '1.5' }}>{executionPopup.message}</p>
              <button className="btn btn-primary" style={{ padding: '10px 24px', width: '100%', maxWidth: '200px', borderRadius: '8px', fontSize: '15px', fontWeight: '500' }} onClick={() => setExecutionPopup(null)}>OK</button>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(jsxBlock, "");

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Refactored LegacyWorkspace.jsx");
