import React from 'react';
import { useState } from 'react';

import { Button, Menu } from 'semantic-ui-react';
import { AboutModal } from './AboutModal';

export const MenuBar = () => {
  const [aboutModalOpen, updateAboutModalOpen] = useState(false);

  return (
    <React.Fragment>
      <AboutModal aboutModalOpen={aboutModalOpen} updateAboutModalOpen={updateAboutModalOpen} />
      <Menu>
        <Menu.Item header>Convert Geospatial Files</Menu.Item>
        <Menu.Item position="right">
          <Button onClick={() => updateAboutModalOpen(true)}>About</Button>
        </Menu.Item>
      </Menu>
    </React.Fragment>
  );
};
