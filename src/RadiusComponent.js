import React, { useState } from "react";
import './RadiusComponent.css';
function RadiusComponent({onRadiusSubmit, handleClose}){
// radius state hook
const [radius, setRadius] = useState('')
// handle radius
const handleSubmit = (e)=>{
e.preventDefault();
if(radius){
onRadiusSubmit(Number(radius));    
setRadius('');
handleClose()
}
}
const handleInputChange = (e)=>{
    setRadius(e.target.value)
}
return(
    <div className="radius-popup">
        <form onSubmit={handleSubmit}>
            <label>
                <input
                type="number"
                placeholder="Enter radius in km"
                value={radius}
                onChange={handleInputChange}
                min="0"
                max="100"
                required
                

                >
                </input>
            </label>
            <div className="button-container">
        <button type="submit">Submit</button>
        <button className="close-button" onClick={handleClose}>Close</button>
    </div>
        </form>
    </div>
);
}
export default RadiusComponent