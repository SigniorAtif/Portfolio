// React and routing
import { NavLink } from "react-router";
import { startProgress } from "@/utils.jsx";

// Utility Components
import TextBlock from "@/components/TextBlock.jsx";

// Toons
import Astronaut from "@/components/Toons/Astronaut/Astronaut.jsx";
import CoffeeMug from "@/components/Toons/CoffeeMug/CoffeeMug.jsx";

// Scss
import "@/css/pages/404.scss";
import "@/css/Components/SceneSection.scss";

export default function NotFound() {
  return (
    <div id="err404" className="wrapper">
      <div className="static-container">
        <h1 className="title">
          <span className="params">new</span> Error(
          <span className="params">404</span>)
        </h1>

        <TextBlock>
          <p>The page you requested could not be found.</p>
          <NavLink
            to={"/"}
            end
            className={({ isActive }) =>
              isActive ? "router-link-exact-active bt" : "bt"
            }
            onClick={() => {
              startProgress();
            }}
          >
            <svg className="nav-ico -prev" viewBox="0 0 16 16">
              <path d="M5,1h10v10 M5.5,10.5l0.8-0.8" />
            </svg>
            Back to home
          </NavLink>
        </TextBlock>
      </div>

      <Astronaut isPlaying={true} />
      <CoffeeMug isPlaying={true} />
    </div>
  );
}
