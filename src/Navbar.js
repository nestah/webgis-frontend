// the navbar component
import React , {useState} from 'react'
import './Navbar.css'
import './viewport.css';

function Navbar({setShowUploadPopup}){
// useState hook to manage state of the sidebar
const [isOpen, setIsOpen] = useState(false) 
//  toggle sidebar
const togglesidebar = () => {
 setIsOpen(!isOpen);
}
// handle upload
const handleUploadClick = (e)=>{
e.preventDefault();
setShowUploadPopup(true)
}

    return(
        <nav className="navbar">
            <div className="logo"><a href="/">GTL</a></div>
            <ul className={`nav-links ${isOpen ? 'nav-active':''}`}>
                <li><a href="/">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#upload" onClick={handleUploadClick}>Upload</a></li>
                <li><a href="#services">Serivces</a></li>
            </ul>
            <div className="burger" onClick={togglesidebar}>
                <div className="burger-icon">
                    {isOpen ? 'X': '☰'}
                </div>
            </div>
        </nav>
    )
}

export default Navbar