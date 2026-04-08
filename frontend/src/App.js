import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Library from './pages/Library';
import BookEditor from './pages/BookEditor';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/book/:id" element={<BookEditor />} />
    </Routes>
  );
}

export default App;
