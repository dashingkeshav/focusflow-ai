const fs = require('fs');

// 1. Update frontend/app/dashboard/focus-circles/page.tsx
let circlesPage = fs.readFileSync('frontend/app/dashboard/focus-circles/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// Replace import
circlesPage = circlesPage.replace(
  "import { useRouter, useSearchParams } from 'next/navigation';",
  "import { useRouter } from 'next/navigation';"
);

// Replace const searchParams = useSearchParams();
circlesPage = circlesPage.replace(
  "  const searchParams = useSearchParams();\n",
  ""
);

// Replace loadCircles selection logic
const oldLoadCircles = `      if (res.success) {
        const cleanCircles = (res.circles || []).filter((c: any) => !c.name.startsWith('QA ') && !c.name.startsWith('Autonomous QA ')); setCircles(cleanCircles);
        if (res.circles?.length > 0) {
          const targetId = autoSelectId || selectedCircleId || res.circles[0].id;
          setSelectedCircleId(targetId);
          loadCircleDetails(targetId);
        } else {
          setSelectedCircleId(null);
          setCircleDetail(null);
        }
      }`;

const newLoadCircles = `      if (res.success) {
        const cleanCircles = (res.circles || []).filter(
          (c: any) => !c.name.startsWith('QA ') && !c.name.startsWith('Autonomous QA ')
        );
        setCircles(cleanCircles);
        if (cleanCircles.length > 0) {
          const targetId = autoSelectId || (selectedCircleId && cleanCircles.some((c: any) => c.id === selectedCircleId) ? selectedCircleId : cleanCircles[0].id);
          setSelectedCircleId(targetId);
          loadCircleDetails(targetId);
        } else {
          setSelectedCircleId(null);
          setCircleDetail(null);
        }
      }`;

circlesPage = circlesPage.replace(oldLoadCircles, newLoadCircles);

// Replace URL join effect
const oldJoinEffect = `  // Handle URL join code
  useEffect(() => {
    const codeParam = searchParams.get('join') || searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam);
      handleJoinByCode(codeParam);
    }
  }, [searchParams]);`;

const newJoinEffect = `  // Handle URL join code safely without Next.js useSearchParams suspense deopt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const codeParam = sp.get('join') || sp.get('code');
      if (codeParam) {
        setJoinCode(codeParam);
        handleJoinByCode(codeParam);
      }
    }
  }, []);`;

circlesPage = circlesPage.replace(oldJoinEffect, newJoinEffect);

// Wrap default export with Suspense
if (!circlesPage.includes('FocusCirclesPageContent')) {
  circlesPage = circlesPage.replace(
    'export default function FocusCirclesPage() {',
    'function FocusCirclesPageContent() {'
  );
  circlesPage += `\n\nexport default function FocusCirclesPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF4500] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono text-gray-400">Loading Focus Circles...</p>
        </div>
      </div>
    }>
      <FocusCirclesPageContent />
    </React.Suspense>
  );
}\n`;
}

fs.writeFileSync('frontend/app/dashboard/focus-circles/page.tsx', circlesPage);
console.log('Updated focus-circles/page.tsx');


// 2. Update frontend/app/dashboard/focus-rooms/page.tsx
let roomsPage = fs.readFileSync('frontend/app/dashboard/focus-rooms/page.tsx', 'utf8').replace(/\r\n/g, '\n');

roomsPage = roomsPage.replace(
  "import { useRouter, useSearchParams } from 'next/navigation';",
  "import { useRouter } from 'next/navigation';"
);

roomsPage = roomsPage.replace(
  "  const searchParams = useSearchParams();\n",
  ""
);

const oldRoomsJoinEffect = `  // Handle URL join code if provided in query ?join=code
  useEffect(() => {
    const codeParam = searchParams.get('join') || searchParams.get('code');
    if (codeParam) {
      setJoinCode(codeParam);
      handleJoinByCode(codeParam);
    }
  }, [searchParams]);`;

const newRoomsJoinEffect = `  // Handle URL join code safely without Next.js useSearchParams suspense deopt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const codeParam = sp.get('join') || sp.get('code');
      if (codeParam) {
        setJoinCode(codeParam);
        handleJoinByCode(codeParam);
      }
    }
  }, []);`;

roomsPage = roomsPage.replace(oldRoomsJoinEffect, newRoomsJoinEffect);

if (!roomsPage.includes('FocusRoomsPageContent')) {
  roomsPage = roomsPage.replace(
    'export default function FocusRoomsPage() {',
    'function FocusRoomsPageContent() {'
  );
  roomsPage += `\n\nexport default function FocusRoomsPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF4500] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono text-gray-400">Loading Focus Rooms...</p>
        </div>
      </div>
    }>
      <FocusRoomsPageContent />
    </React.Suspense>
  );
}\n`;
}

fs.writeFileSync('frontend/app/dashboard/focus-rooms/page.tsx', roomsPage);
console.log('Updated focus-rooms/page.tsx');


// 3. Update backend/src/config/migrate.js to clean all rooms and circles
let migrateCode = fs.readFileSync('backend/src/config/migrate.js', 'utf8').replace(/\r\n/g, '\n');

const oldDeleteBlock = `    -- Clean up any automated test/dummy records so only real user information exists
    DELETE FROM focus_rooms WHERE title LIKE 'QA %' OR title LIKE 'Autonomous QA %';
    DELETE FROM focus_circles WHERE name LIKE 'QA %' OR name LIKE 'Autonomous QA %';
    DELETE FROM project_pods WHERE name LIKE 'QA %' OR name LIKE 'Autonomous QA %';
    DELETE FROM unblock_requests WHERE title LIKE 'Need review on deployment pipeline %';
    DELETE FROM users WHERE email LIKE 'qa_%@focusflow.test';`;

const newDeleteBlock = `    -- Clean up all existing rooms and circles as requested so user can create fresh
    DELETE FROM focus_room_messages;
    DELETE FROM focus_room_members;
    DELETE FROM focus_rooms;
    DELETE FROM focus_circle_commitments;
    DELETE FROM focus_circle_members;
    DELETE FROM focus_circles;
    DELETE FROM project_pods WHERE name LIKE 'QA %' OR name LIKE 'Autonomous QA %';
    DELETE FROM unblock_requests WHERE title LIKE 'Need review on deployment pipeline %';
    DELETE FROM users WHERE email LIKE 'qa_%@focusflow.test';`;

migrateCode = migrateCode.replace(oldDeleteBlock, newDeleteBlock);
fs.writeFileSync('backend/src/config/migrate.js', migrateCode);
console.log('Updated migrate.js with fresh rooms/circles cleanup');


// 4. Update backend/src/controllers/collaborationController.js to add resetAllRoomsAndCircles
let collabCtrl = fs.readFileSync('backend/src/controllers/collaborationController.js', 'utf8').replace(/\r\n/g, '\n');

if (!collabCtrl.includes('exports.resetAllRoomsAndCircles')) {
  collabCtrl += `\n\nexports.resetAllRoomsAndCircles = async (req, res) => {
  try {
    await pool.query(\`
      DELETE FROM focus_room_messages;
      DELETE FROM focus_room_members;
      DELETE FROM focus_rooms;
      DELETE FROM focus_circle_commitments;
      DELETE FROM focus_circle_members;
      DELETE FROM focus_circles;
    \`);
    return res.json({ success: true, message: "All focus rooms and circles successfully cleared from database." });
  } catch (error) {
    console.error("resetAllRoomsAndCircles error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to reset rooms and circles." });
  }
};\n`;
  fs.writeFileSync('backend/src/controllers/collaborationController.js', collabCtrl);
  console.log('Added resetAllRoomsAndCircles to collaborationController.js');
}

// 5. Update backend/src/routes/collaborationRoutes.js
let collabRoutes = fs.readFileSync('backend/src/routes/collaborationRoutes.js', 'utf8').replace(/\r\n/g, '\n');
if (!collabRoutes.includes('reset-all')) {
  collabRoutes = collabRoutes.replace(
    'router.post("/circles/:id/archive", collaborationController.archiveCircle);',
    'router.post("/circles/:id/archive", collaborationController.archiveCircle);\nrouter.post("/reset-all", collaborationController.resetAllRoomsAndCircles);'
  );
  fs.writeFileSync('backend/src/routes/collaborationRoutes.js', collabRoutes);
  console.log('Added /reset-all route to collaborationRoutes.js');
}

// 6. Update frontend/app/error.tsx high-contrast button styling
let errPage = fs.readFileSync('frontend/app/error.tsx', 'utf8').replace(/\r\n/g, '\n');
errPage = errPage.replace(
  'className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 sm:w-auto"',
  'className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-900 px-6 text-sm font-bold text-white shadow-xs transition-colors hover:bg-slate-800 sm:w-auto"'
);
fs.writeFileSync('frontend/app/error.tsx', errPage);
console.log('Updated app/error.tsx button styling');
