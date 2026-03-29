update public.questions
set prompt = E'Welche Aussage passt eher zu dir?\n\nA: Wenn mir jemand widerspricht, versuche ich zuerst zu verstehen, wie die andere Person darauf schaut.\nB: Wenn mir jemand widerspricht, erkläre ich zuerst, warum ich meine Sicht weiterhin für richtig halte.'
where id = 'q12_conflict_fc1';
