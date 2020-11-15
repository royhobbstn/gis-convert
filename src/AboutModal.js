import React from 'react';
import { Modal } from 'semantic-ui-react';

export function AboutModal({ aboutModalOpen, updateAboutModalOpen }) {
  return (
    <Modal
      onClose={() => updateAboutModalOpen(false)}
      onOpen={() => updateAboutModalOpen(true)}
      open={aboutModalOpen}
      closeIcon
      size="small"
    >
      <Modal.Header>About this Page</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <p>
            This is a thin user interface around the powerful{' '}
            <a
              href="https://gdal.org/programs/ogrinfo.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              ogrinfo
            </a>{' '}
            and{' '}
            <a
              href="https://gdal.org/programs/ogr2ogr.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              ogr2ogr
            </a>{' '}
            commands.
          </p>
          <p>
            Session data is tracked in browser{' '}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage"
              target="_blank"
              rel="noopener noreferrer"
            >
              localStorage
            </a>
            . A unique and anonymous session ID will be created for you, and it will persist across
            browser sessions and tabs.
          </p>
          <p>
            If you navigate away from the page and then return, your identity will be remembered and
            your files will still be available to you. All uploads and converted products expire 24
            hours after creation, at which point they will be deleted from the server.
          </p>
          <p>
            While I have no interest personally in the data that is uploaded, I can not guarantee
            privacy. Please don't upload any sensitive information.
          </p>
          <p>
            Bugs? Feature requests? Contact the author at{' '}
            <a href="mailto:danieljtrone@gmail.com">danieljtrone@gmail.com</a>.<br />
            Check out some of my other work at{' '}
            <a href="https://github.com/royhobbstn" target="_blank" rel="noopener noreferrer">
              Github
            </a>
            .<br />
            Occasionally, I blog:{' '}
            <a href="https://www.danieltrone.com/" target="_blank" rel="noopener noreferrer">
              www.danieltrone.com
            </a>
            .
          </p>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  );
}

export default AboutModal;
